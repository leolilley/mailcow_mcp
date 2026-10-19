/**
 * OAuth 2.1 Authorization Server
 *
 * Implements the MCP SDK's `OAuthServerProvider` so the HTTP transport can be
 * used as a remote MCP server by clients that require OAuth. Claude (web and
 * desktop) and ChatGPT both do. Neither client can send a static bearer header,
 * so a token endpoint is not optional for a remote deployment.
 *
 * Scope of this implementation, stated plainly:
 *
 * This authenticates *the operator* to *this server*. It is a single-operator
 * gate, not an identity provider. There is one credential, set in the
 * environment, and every issued token carries the same authority. If you need
 * several people with different permissions, put a real IdP in front and use
 * the SDK's ProxyOAuthServerProvider instead. The transport does not care which
 * provider it is handed.
 *
 * What it does implement, because the clients require it:
 *   - authorization code flow with PKCE (S256), per OAuth 2.1
 *   - dynamic client registration, so Claude can register itself
 *   - refresh tokens, so sessions survive access-token expiry
 *   - token revocation
 *
 * Tokens are held in memory. A restart invalidates them and the client
 * re-authorizes, which is the correct trade for a single-operator server: it
 * avoids persisting bearer tokens to disk, and re-auth is one click.
 *
 * Grants, not loose tokens
 * ------------------------
 * Every authorization produces a *grant*, and both the access token and the
 * refresh token belong to it. This matters for four things that are wrong if
 * tokens are tracked individually:
 *
 *   1. Revocation. RFC 7009 says revoking one token SHOULD invalidate the
 *      others issued with it. Tracked individually, revoking an access token
 *      leaves its refresh token live, so the client mints a replacement and
 *      the revocation achieves nothing.
 *   2. Lifetime. A rotating refresh token with no absolute expiry is a
 *      permanent credential: each use issues the next one, so a leaked token
 *      never ages out. The grant carries one absolute deadline that rotation
 *      cannot extend, and the rotation path refuses to run at all if the grant
 *      is gone rather than quietly starting a fresh one.
 *   3. Replay detection. Rotation alone does not tell a retry from a theft.
 *      Presenting an already-consumed refresh token revokes the whole grant,
 *      per OAuth 2.1 and RFC 9700 section 4.14.2, because reuse is the only
 *      signal that distinguishes the two.
 *   4. Session binding. The transport binds an MCP session to the grant rather
 *      than to a token, so a refresh does not invalidate the session and
 *      another client's token cannot adopt it.
 *
 * Everything an unauthenticated caller can reach is bounded
 * --------------------------------------------------------
 * `/authorize` and `/register` are open to the internet by design, because
 * that is how dynamic client registration works. So every structure they can
 * grow has a hard ceiling, and every string they can supply is truncated
 * before it is stored or rendered. An unbounded store here is not merely a
 * memory leak: this process holds the password-guessing backoff in memory, so
 * anything that can force a restart also resets that backoff.
 */

import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';

/**
 * Path the consent form submits to.
 *
 * Not `/authorize`: the SDK's authorization handler already accepts both GET
 * and POST there, so a form posting to it is parsed as an OAuth request and
 * rejected before this server's handler runs.
 */
export const CONSENT_SUBMIT_PATH = '/authorize/consent';

/** Scopes this server understands. */
export const SUPPORTED_SCOPES = ['mailcow:read', 'mailcow:write'] as const;
export type MailcowScope = (typeof SUPPORTED_SCOPES)[number];

/** Access token lifetime. Short, because refresh is free and silent. */
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
/** Authorization codes are single-use and must be redeemed promptly. */
const AUTH_CODE_TTL_MS = 60 * 1000;
/**
 * Absolute lifetime of a grant, counted from the authorization the operator
 * approved. Refresh rotation issues new tokens but never moves this deadline,
 * so a leaked refresh token expires rather than living until the next restart.
 */
const GRANT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * How long a rendered consent page stays submittable. A page left open in a
 * tab should not still authorize an hour later.
 */
const CONSENT_TTL_MS = 10 * 60 * 1000;

/**
 * Ceilings on everything an unauthenticated caller can grow or supply.
 *
 * Dynamic registration is open, so these are the only thing between a stranger
 * and this process's heap. The client-name limit does double duty: it is also
 * what stops a registration from turning the consent page into an amplifier,
 * and what stops attacker-supplied text from pushing the one field the
 * operator must read off the screen.
 */
const MAX_CLIENTS = 100;
const MAX_CLIENT_NAME_LENGTH = 64;
const MAX_REDIRECT_URIS = 10;
const MAX_URI_LENGTH = 512;
const MAX_CONTACTS = 5;

export interface MailcowOAuthOptions {
  /**
   * Shared secret the operator enters on the consent screen.
   *
   * Required. The server refuses to start without one rather than defaulting to
   * something guessable: a default password on an internet-reachable mail
   * admin endpoint is worse than no auth at all, because it looks protected.
   */
  operatorPassword: string;
  /** Public issuer URL, e.g. https://mcp-mail.example.com */
  issuerUrl: URL;
  /** Scopes this server understands. Defaults to SUPPORTED_SCOPES. */
  scopesSupported?: string[];
  /**
   * Called with a grant id whenever a grant is revoked or expires.
   *
   * The transport uses this to close MCP sessions bound to that grant. Without
   * it, revoking a token leaves the session object resident, and an event
   * stream opened before the revocation keeps being served, because bearer
   * auth is checked per request and not per message.
   */
  onGrantRevoked?: (grantId: string) => void;
}

interface StoredAuthCode {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

/** A token's membership in a grant. The grant holds the authority. */
interface StoredToken {
  grantId: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: string;
}

interface Grant {
  clientId: string;
  /** The scopes currently in force. Narrowed by a narrowing refresh. */
  scopes: string[];
  resource?: string;
  /** Absolute deadline. Rotation does not move it. */
  expiresAt: number;
  accessTokens: Set<string>;
  refreshTokens: Set<string>;
}

interface PendingAuthorization {
  /** Single-use marker. One operator approval must mint exactly one code. */
  jti: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

/** Constant-time string comparison that tolerates differing lengths. */
function secretsMatch(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function token(): string {
  return randomBytes(32).toString('base64url');
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

/**
 * Keep only the registration fields this server uses, each within a bound.
 *
 * The SDK's registration schema bounds no string, and the request body limit is
 * a megabyte, so without this a single registration can park most of a
 * megabyte in the clients map for the lifetime of the process, and have it
 * echoed back out of the consent page on every unauthenticated GET.
 */
function sanitizeClient(client: OAuthClientInformationFull): OAuthClientInformationFull {
  const redirectUris = (client.redirect_uris ?? [])
    .filter((uri) => typeof uri === 'string' && uri.length <= MAX_URI_LENGTH)
    .slice(0, MAX_REDIRECT_URIS);

  const sanitized: OAuthClientInformationFull = {
    ...client,
    redirect_uris: redirectUris,
  };

  if (typeof client.client_name === 'string') {
    sanitized.client_name = truncate(client.client_name, MAX_CLIENT_NAME_LENGTH);
  }
  if (Array.isArray(client.contacts)) {
    sanitized.contacts = client.contacts
      .filter((c): c is string => typeof c === 'string')
      .slice(0, MAX_CONTACTS)
      .map((c) => truncate(c, MAX_URI_LENGTH));
  }
  // Nothing reads these, and both are unbounded strings in the SDK schema.
  delete sanitized.software_statement;
  delete sanitized.logo_uri;
  delete sanitized.client_uri;
  delete sanitized.policy_uri;
  delete sanitized.tos_uri;

  return sanitized;
}

/**
 * In-memory client store with dynamic registration, bounded.
 *
 * Claude registers itself through DCR on first connect; ChatGPT may be given a
 * client ID and secret manually. Both paths end up here.
 *
 * Registration is open to the internet, so the map is capped and evicts the
 * least recently used entry. A client holding a live grant is pinned and never
 * evicted, so an attacker cannot register in a loop to push the operator's own
 * working client out and break their sessions.
 */
class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();
  /** Clients protected while they hold a grant. */
  private pinned = new Set<string>();
  /**
   * Clients configured by the operator rather than registered over the
   * network. Permanently protected.
   *
   * Kept separate from `pinned` because unpinning happens when a client's last
   * grant is revoked, and a seeded client that lost its pin that way would
   * become evictable by unauthenticated registration traffic: the operator's
   * configured client silently disappears and the vendor cannot authenticate.
   */
  private seeded = new Set<string>();

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const client = this.clients.get(clientId);
    if (client) {
      // Map preserves insertion order, so re-inserting marks this entry as the
      // most recently used.
      this.clients.delete(clientId);
      this.clients.set(clientId, client);
    }
    return client;
  }

  async registerClient(client: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    const sanitized = sanitizeClient(client);
    this.evict();
    this.clients.set(sanitized.client_id, sanitized);
    return sanitized;
  }

  /** Pre-register a client for vendors that do not support DCR. */
  seed(client: OAuthClientInformationFull): void {
    const sanitized = sanitizeClient(client);
    this.clients.set(sanitized.client_id, sanitized);
    this.seeded.add(sanitized.client_id);
  }

  /** Protect a client from eviction while it holds a grant. */
  pin(clientId: string): void {
    this.pinned.add(clientId);
  }

  unpin(clientId: string): void {
    this.pinned.delete(clientId);
  }

  private evict(): void {
    while (this.clients.size >= MAX_CLIENTS) {
      let victim: string | undefined;
      for (const key of this.clients.keys()) {
        if (!this.pinned.has(key) && !this.seeded.has(key)) {
          victim = key;
          break;
        }
      }
      // Every remaining entry holds a live grant. Stop rather than evict one:
      // dropping it would break a working session, and the grant ceiling plus
      // the 30 day deadline already bound this case.
      if (victim === undefined) return;
      this.clients.delete(victim);
    }
  }

  list(): OAuthClientInformationFull[] {
    return [...this.clients.values()];
  }

  get size(): number {
    return this.clients.size;
  }
}

export class MailcowOAuthProvider implements OAuthServerProvider {
  private readonly _clientsStore = new InMemoryClientsStore();
  private readonly codes = new Map<string, StoredAuthCode>();
  private readonly accessTokens = new Map<string, StoredToken>();
  private readonly refreshTokens = new Map<string, StoredToken>();
  private readonly grants = new Map<string, Grant>();
  /**
   * Refresh tokens that have already been rotated, mapped to their grant.
   *
   * Presenting one of these means the token was used twice, which is the
   * signal that it leaked rather than that the client retried.
   */
  private readonly consumedRefreshTokens = new Map<string, string>();
  /** Consent approvals already redeemed, mapped to when they stop mattering. */
  private readonly redeemedApprovals = new Map<string, number>();
  private readonly scopes: string[];
  /**
   * Key for signing the pending-authorization blob. Per-process and never
   * leaves it, so a blob cannot be forged and does not survive a restart.
   */
  private readonly blobKey = randomBytes(32);

  constructor(private readonly options: MailcowOAuthOptions) {
    // The consent route can throttle how often a guess is checked, but it
    // cannot tell the operator from an attacker: /authorize needs no
    // authentication and registration is open. Entropy is therefore the
    // control that actually bounds guessing, so the floor is set where a
    // throttled online attack is hopeless rather than merely slow.
    if (!options.operatorPassword || options.operatorPassword.length < 24) {
      throw new Error(
        'MCP_OAUTH_PASSWORD must be set to at least 24 characters, and should be ' +
          'random rather than memorable. It is the only credential protecting ' +
          'write access to your mail server, on an endpoint that cannot tell you ' +
          'apart from anyone else who can reach it.',
      );
    }
    this.scopes = options.scopesSupported ?? [...SUPPORTED_SCOPES];
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  /** Scopes advertised in metadata, and the ceiling on what can be granted. */
  get scopesSupported(): string[] {
    return [...this.scopes];
  }

  /** Pre-register a client ID/secret pair for clients without DCR. */
  seedClient(client: OAuthClientInformationFull): void {
    this._clientsStore.seed(client);
  }

  /**
   * Render the consent screen.
   *
   * The SDK routes GET /authorize here. We serve a minimal form on GET and
   * handle the submission on POST through `completeAuthorization` below, called
   * from the route the HTTP transport installs.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    // A client may not ask for authority this server does not define. Rejecting
    // here rather than silently narrowing means a client asking for something
    // unexpected is told so, instead of appearing to work with less access than
    // it believes it has.
    const requested = params.scopes ?? [];
    const unknown = requested.filter((s) => !this.scopes.includes(s));
    if (unknown.length > 0) {
      throw new InvalidScopeError(`Unsupported scope(s): ${unknown.join(', ')}`);
    }
    // Clients that request nothing get the full supported set, which is what
    // the metadata advertises and what Claude's registration asks for.
    const granted = requested.length > 0 ? requested : [...this.scopes];

    // RFC 8707: an authorization server must not issue a token for a resource
    // it does not serve. Without this the audience recorded on the token is
    // whatever the caller asked for, which any downstream consumer would
    // reasonably trust. Compared by origin rather than full URL because the
    // MCP endpoint sits on a path under the issuer and clients legitimately
    // send either form.
    if (params.resource && !this.servesResource(params.resource)) {
      throw new InvalidTargetError(
        `This server does not serve the requested resource: ${params.resource.toString()}`,
      );
    }

    const pending = this.sealPending({
      jti: token(),
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      state: params.state ?? '',
      scopes: granted,
      resource: params.resource?.toString(),
      expiresAt: Date.now() + CONSENT_TTL_MS,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(consentPage(client, pending, params.redirectUri, granted));
  }

  private servesResource(resource: URL): boolean {
    try {
      return resource.origin === this.options.issuerUrl.origin;
    } catch {
      return false;
    }
  }

  /**
   * Validate the operator password and mint an authorization code.
   *
   * Returns the redirect URL the browser should be sent to, or null when the
   * blob is unusable or the password is wrong. The caller is responsible for
   * not revealing which.
   */
  completeAuthorization(pendingBlob: string, password: string): string | null {
    this.sweep();

    // The blob is verified before the password is compared, so a caller who
    // has not been through /authorize cannot use this route as a password
    // oracle at all.
    const pending = this.openPending(pendingBlob);
    if (!pending) return null;

    if (!secretsMatch(password, this.options.operatorPassword)) {
      return null;
    }

    // One approval, one code. Without this the same (blob, password) pair is
    // replayable for the ten minutes the blob lives, and each replay produces
    // an independent grant with its own refresh token and its own 30 day
    // deadline. Those siblings survive revoking the grant the client knows
    // about, because they are different grants, and they appear in no client
    // UI. A browser form resubmission is enough to create one.
    if (this.redeemedApprovals.has(pending.jti)) return null;
    this.redeemedApprovals.set(pending.jti, pending.expiresAt);

    const code = token();
    this.codes.set(code, {
      clientId: pending.clientId,
      codeChallenge: pending.codeChallenge,
      redirectUri: pending.redirectUri,
      scopes: pending.scopes,
      resource: pending.resource,
      expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    });

    const target = new URL(pending.redirectUri);
    target.searchParams.set('code', code);
    if (pending.state) target.searchParams.set('state', pending.state);
    return target.toString();
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const stored = this.codes.get(authorizationCode);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new InvalidGrantError('Authorization code is unknown or expired');
    }
    return stored.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const stored = this.codes.get(authorizationCode);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new InvalidGrantError('Authorization code is unknown or expired');
    }
    if (stored.clientId !== client.client_id) {
      throw new InvalidGrantError('Authorization code was issued to another client');
    }
    // RFC 6749 section 4.1.3. PKCE already binds the code to the client
    // instance, so this is a second layer rather than the only one, but the
    // value was recorded at authorization time and checking it costs nothing.
    if (redirectUri !== undefined && redirectUri !== stored.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match the authorization request');
    }
    if (resource && !this.servesResource(resource)) {
      throw new InvalidTargetError('This server does not serve the requested resource');
    }

    // Single use. Delete before issuing so a replay cannot race.
    this.codes.delete(authorizationCode);

    return this.issueForNewGrant(client.client_id, stored.scopes, stored.resource);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const stored = this.refreshTokens.get(refreshToken);

    if (!stored) {
      // Reuse of an already-rotated token means two parties hold the chain, and
      // only one of them should. OAuth 2.1 and RFC 9700 section 4.14.2 require
      // revoking the whole grant on detected reuse: rotation on its own cannot
      // tell a client retry from a stolen token, and without this the thief
      // keeps the live chain while the legitimate client quietly re-authorizes
      // and sees nothing worse than one unexpected sign-in.
      const leakedGrantId = this.consumedRefreshTokens.get(refreshToken);
      if (leakedGrantId) {
        this.revokeGrant(leakedGrantId);
        throw new InvalidGrantError(
          'Refresh token has already been used; the grant has been revoked',
        );
      }
      throw new InvalidGrantError('Refresh token is unknown or revoked');
    }

    if (stored.clientId !== client.client_id) {
      throw new InvalidGrantError('Refresh token was issued to another client');
    }
    if (resource && !this.servesResource(resource)) {
      throw new InvalidTargetError('This server does not serve the requested resource');
    }

    const grant = this.grants.get(stored.grantId);
    if (!grant || grant.expiresAt < Date.now()) {
      this.revokeGrant(stored.grantId);
      throw new InvalidGrantError('Grant has expired; re-authorization is required');
    }

    // A refresh may narrow a token's authority but never widen it. Without this
    // check a client granted read could ask for write on refresh and get it,
    // which makes the scope recorded on the grant decorative. Measured against
    // the grant rather than the presented token, so a narrowing refresh cannot
    // be walked back up afterwards.
    const ceiling = grant.scopes;
    if (scopes && scopes.length > 0) {
      const widened = scopes.filter((s) => !ceiling.includes(s));
      if (widened.length > 0) {
        throw new InvalidScopeError(
          `Refresh cannot widen scope; not granted: ${widened.join(', ')}`,
        );
      }
    }

    // Rotate: the presented refresh token is consumed, and remembered as
    // consumed so that a later presentation is detected as reuse.
    this.refreshTokens.delete(refreshToken);
    grant.refreshTokens.delete(refreshToken);
    this.consumedRefreshTokens.set(refreshToken, stored.grantId);

    const next = scopes && scopes.length > 0 ? scopes : stored.scopes;
    // Narrowing is permanent for the grant, so it is also the new ceiling.
    grant.scopes = next;

    return this.issueForExistingGrant(stored.grantId, client.client_id, next, stored.resource);
  }

  async verifyAccessToken(accessToken: string): Promise<AuthInfo> {
    const stored = this.accessTokens.get(accessToken);
    if (!stored) {
      throw new InvalidTokenError('Access token is unknown or revoked');
    }
    if (stored.expiresAt < Date.now()) {
      this.forgetAccessToken(accessToken);
      throw new InvalidTokenError('Access token has expired');
    }

    // The grant is the authority. A token whose grant was revoked or has aged
    // out is not usable even while the token's own expiry is still in future.
    const grant = this.grants.get(stored.grantId);
    if (!grant) {
      this.forgetAccessToken(accessToken);
      throw new InvalidTokenError('Access token is unknown or revoked');
    }
    if (grant.expiresAt < Date.now()) {
      this.revokeGrant(stored.grantId);
      throw new InvalidTokenError('Grant has expired; re-authorization is required');
    }

    return {
      token: accessToken,
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Math.floor(stored.expiresAt / 1000),
      ...(stored.resource ? { resource: new URL(stored.resource) } : {}),
      extra: { grantId: stored.grantId },
    };
  }

  /**
   * Revoke the whole grant, not the single token presented.
   *
   * RFC 7009 section 2.1 says revoking a token SHOULD invalidate the others
   * issued from the same authorization, and here it is not merely tidy: with
   * the pair unlinked, revoking an access token leaves its refresh token live,
   * so the client immediately mints a replacement and the revocation is
   * cosmetic.
   */
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const stored =
      this.accessTokens.get(request.token) ?? this.refreshTokens.get(request.token);
    // RFC 7009 section 2.2: an unknown token is not an error.
    if (!stored) return;
    // A token issued to another client is not this caller's to revoke. The
    // token endpoint authenticates the client, but a public client
    // authenticates with nothing beyond its own client_id, so without this
    // check anyone holding a token value could cut off another client's
    // session. RFC 7009 section 2.1 permits ignoring such a request.
    if (stored.clientId !== client.client_id) return;
    this.revokeGrant(stored.grantId);
  }

  /** Drop a grant and every token issued under it. */
  private revokeGrant(grantId: string): void {
    const grant = this.grants.get(grantId);
    if (grant) {
      for (const t of grant.accessTokens) this.accessTokens.delete(t);
      for (const t of grant.refreshTokens) this.refreshTokens.delete(t);
      this.grants.delete(grantId);
      if (!this.clientHasGrant(grant.clientId)) this._clientsStore.unpin(grant.clientId);
    } else {
      // Defensive: a token pointing at a grant that is already gone.
      for (const [t, v] of this.accessTokens) if (v.grantId === grantId) this.accessTokens.delete(t);
      for (const [t, v] of this.refreshTokens) if (v.grantId === grantId) this.refreshTokens.delete(t);
    }

    for (const [t, id] of this.consumedRefreshTokens) {
      if (id === grantId) this.consumedRefreshTokens.delete(t);
    }

    // Let the transport close any MCP session bound to this grant. Without it
    // the session object stays resident, and an event stream opened before the
    // revocation keeps being served, because bearer auth is per request.
    this.options.onGrantRevoked?.(grantId);
  }

  private clientHasGrant(clientId: string): boolean {
    for (const grant of this.grants.values()) {
      if (grant.clientId === clientId) return true;
    }
    return false;
  }

  private forgetAccessToken(accessToken: string): void {
    const stored = this.accessTokens.get(accessToken);
    this.accessTokens.delete(accessToken);
    if (stored) this.grants.get(stored.grantId)?.accessTokens.delete(accessToken);
  }

  /** First issuance for a freshly approved authorization. */
  private issueForNewGrant(clientId: string, scopes: string[], resource?: string): OAuthTokens {
    this.sweep();

    const grantId = token();
    const grant: Grant = {
      clientId,
      scopes,
      resource,
      expiresAt: Date.now() + GRANT_TTL_MS,
      accessTokens: new Set<string>(),
      refreshTokens: new Set<string>(),
    };
    this.grants.set(grantId, grant);
    this._clientsStore.pin(clientId);

    return this.mintPair(grantId, grant, clientId, scopes, resource);
  }

  /**
   * Re-issuance for an existing grant, on refresh.
   *
   * Throws rather than creating a grant when the id is unknown. An earlier
   * version fell through to the first-issuance path here, which silently minted
   * a replacement grant with a *renewed* 30 day deadline and handed back a
   * working token pair, falsifying the one invariant the grant exists to
   * enforce.
   */
  private issueForExistingGrant(
    grantId: string,
    clientId: string,
    scopes: string[],
    resource?: string,
  ): OAuthTokens {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new InvalidGrantError('Grant no longer exists; re-authorization is required');
    }
    return this.mintPair(grantId, grant, clientId, scopes, resource);
  }

  private mintPair(
    grantId: string,
    grant: Grant,
    clientId: string,
    scopes: string[],
    resource?: string,
  ): OAuthTokens {
    const accessToken = token();
    const refreshToken = token();
    const accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;

    this.accessTokens.set(accessToken, {
      grantId,
      clientId,
      scopes,
      expiresAt: accessExpiresAt,
      resource,
    });
    // The refresh token inherits the grant's absolute deadline rather than
    // getting a fresh one, so rotating cannot extend the chain indefinitely.
    this.refreshTokens.set(refreshToken, {
      grantId,
      clientId,
      scopes,
      expiresAt: grant.expiresAt,
      resource,
    });
    grant.accessTokens.add(accessToken);
    grant.refreshTokens.add(refreshToken);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    };
  }

  /**
   * Drop expired codes, tokens, grants and approval markers.
   *
   * Called from both issuance and consent submission, so the bound does not
   * depend on a successful token exchange ever happening.
   */
  private sweep(): void {
    const now = Date.now();
    for (const [k, v] of this.codes) if (v.expiresAt < now) this.codes.delete(k);
    for (const [k, v] of this.accessTokens) if (v.expiresAt < now) this.forgetAccessToken(k);
    for (const [k, v] of this.refreshTokens) {
      if (v.expiresAt < now) {
        this.refreshTokens.delete(k);
        this.grants.get(v.grantId)?.refreshTokens.delete(k);
      }
    }
    for (const [k, expiresAt] of this.redeemedApprovals) {
      if (expiresAt < now) this.redeemedApprovals.delete(k);
    }
    for (const [id, g] of this.grants) if (g.expiresAt < now) this.revokeGrant(id);
  }

  /** Visible for tests: number of live grants. */
  get grantCount(): number {
    return this.grants.size;
  }

  /** Visible for tests: number of registered clients retained. */
  get clientCount(): number {
    return this._clientsStore.size;
  }

  // --- pending-authorization blob ------------------------------------------
  //
  // The blob carries the authorization parameters across the consent page, so
  // the server holds no state between rendering the form and the operator
  // submitting it. It travels through the operator's browser, which makes it
  // attacker-reachable, so it is signed with a per-process key: the parameters
  // that come back are the ones this server put in. The `jti` makes an
  // approval single-use; see completeAuthorization.

  private sealPending(payload: PendingAuthorization): string {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const mac = createHmac('sha256', this.blobKey).update(body).digest('base64url');
    return `${body}.${mac}`;
  }

  private openPending(blob: string): PendingAuthorization | null {
    const dot = blob.lastIndexOf('.');
    if (dot <= 0) return null;
    const body = blob.slice(0, dot);
    const mac = blob.slice(dot + 1);

    // A sha256 digest is exactly 43 base64url characters. Checking the length
    // and the alphabet before decoding means a blob cannot be varied by
    // reshaping its signature, only by forging one.
    if (mac.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(mac)) return null;

    const expected = createHmac('sha256', this.blobKey).update(body).digest();
    let presented: Buffer;
    try {
      presented = Buffer.from(mac, 'base64url');
    } catch {
      return null;
    }
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
      return null;
    }

    try {
      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      // The payload is signed, so these are defence in depth against a future
      // change to what gets sealed rather than against an attacker.
      if (typeof parsed?.expiresAt !== 'number' || parsed.expiresAt < Date.now()) return null;
      if (typeof parsed?.jti !== 'string' || parsed.jti.length === 0) return null;
      if (typeof parsed?.redirectUri !== 'string' || typeof parsed?.clientId !== 'string') return null;
      if (typeof parsed?.codeChallenge !== 'string') return null;
      if (!Array.isArray(parsed?.scopes) || parsed.scopes.some((s: unknown) => typeof s !== 'string')) {
        return null;
      }
      return parsed as PendingAuthorization;
    } catch {
      return null;
    }
  }
}

/**
 * Minimal consent screen.
 *
 * Deliberately plain: no external assets, no inline scripts, nothing that a
 * CSP would have to allow.
 *
 * The layout is part of the security control, not decoration. The one thing an
 * operator must read is where the authorization code will be sent, so it comes
 * first, before anything the requesting client chose. An earlier version put
 * the client's self-declared name above it and let that name be any length,
 * which meant an attacker could register a client whose "name" was forty
 * kilobytes of reassuring text and push the real destination several screens
 * down. The password field also carried `autofocus`, so the browser scrolled
 * the operator straight past both warnings to the form. Between them, the one
 * field the attacker could not forge was the one field the operator never saw.
 */
function consentPage(
  client: OAuthClientInformationFull,
  pending: string,
  redirectUri: string,
  scopes: string[],
): string {
  // client_name is chosen by whoever registered the client. With dynamic
  // registration open, that is anyone on the internet, so an attacker can
  // register a client called "Claude", point its redirect at a host they
  // control, and send the operator a genuine authorization URL on the right
  // domain with valid TLS. Nothing about the name can be trusted, which is why
  // it is truncated, escaped, and rendered below the destination.
  const name = escapeHtml(truncate(client.client_name ?? client.client_id, MAX_CLIENT_NAME_LENGTH));
  const target = escapeHtml(truncate(redirectUri, MAX_URI_LENGTH));
  const scopeList = scopes.length > 0 ? escapeHtml(scopes.join(', ')) : '(none)';
  let origin: string;
  try {
    origin = escapeHtml(new URL(redirectUri).origin);
  } catch {
    origin = '(unparseable)';
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize access to mailcow</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 34rem; margin: 3rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  .dest { border: 2px solid #c2410c; border-radius: 4px; padding: .75rem 1rem; margin: 1.5rem 0; }
  .dest-label { font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; opacity: .75; }
  .dest-origin { font-size: 1.35rem; font-weight: 700; font-family: ui-monospace, monospace; word-break: break-all; margin: .25rem 0; }
  .dest-full { font-size: .8rem; opacity: .7; font-family: ui-monospace, monospace; word-break: break-all; }
  .warn { border-left: 3px solid #c2410c; padding: .5rem 0 .5rem .75rem; margin: 1.5rem 0; }
  .claimed { font-family: ui-monospace, monospace; word-break: break-all; }
  code { font-family: ui-monospace, monospace; }
  label { display: block; margin: 1.5rem 0 .25rem; font-weight: 600; }
  input[type=password] { width: 100%; padding: .6rem; font-size: 1rem; box-sizing: border-box; }
  button { margin-top: 1rem; padding: .6rem 1.2rem; font-size: 1rem; cursor: pointer; }
</style>
</head>
<body>
  <h1>Authorize access to mailcow</h1>

  <div class="dest">
    <div class="dest-label">Read this first. The authorization code will be sent to</div>
    <div class="dest-origin">${origin}</div>
    <div class="dest-full">${target}</div>
  </div>

  <div class="warn">
    <strong>Check that destination.</strong> If it is not a host belonging to the
    service you are connecting, for example <code>claude.ai</code> or
    <code>chatgpt.com</code>, stop now: approving would hand control of this mail
    server to whoever owns it.
  </div>

  <p>The client requesting access calls itself <span class="claimed">${name}</span>.
     That name was chosen by whoever registered the client and proves nothing;
     anyone can register a client under any name. Only the destination above
     cannot be faked.</p>

  <div class="warn">
    Approving grants the tools this server has registered, which may include
    creating and modifying mailboxes, aliases and domains. Scope requested:
    <code>${scopeList}</code>. Only continue if you started this authorization
    yourself, just now.
  </div>

  <form method="POST" action="${CONSENT_SUBMIT_PATH}">
    <input type="hidden" name="pending" value="${pending}">
    <label for="password">Operator password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
