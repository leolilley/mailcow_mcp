/**
 * OAuth provider: grants, revocation, scope and the consent blob.
 *
 * Each test here corresponds to a specific way the first version of this
 * provider was wrong, found by reviewing it before deploying it. They are
 * written against the behaviour rather than the implementation, so a rewrite
 * that reintroduces any of these fails.
 *
 *   - revoking one token left the other half of the pair live, so the client
 *     minted a replacement and revocation did nothing
 *   - refresh tokens never expired, so a leaked one was a permanent
 *     credential until the process restarted
 *   - scopes were advertised and then never enforced, and a refresh could
 *     widen its own scope
 *   - the pending-authorization blob was unsigned, so the parameters that came
 *     back from the browser were not necessarily the ones the server sent
 */

import type { Response } from 'express';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { MailcowOAuthProvider, SUPPORTED_SCOPES } from '../../../src/auth/oauth-provider';

const PASSWORD = 'correct-horse-battery-staple';
const REDIRECT = 'https://client.example/callback';

const CLIENT: OAuthClientInformationFull = {
  client_id: 'test-client',
  redirect_uris: [REDIRECT],
};

const OTHER_CLIENT: OAuthClientInformationFull = {
  client_id: 'other-client',
  redirect_uris: [REDIRECT],
};

function makeProvider(): MailcowOAuthProvider {
  return new MailcowOAuthProvider({
    operatorPassword: PASSWORD,
    issuerUrl: new URL('https://mcp.example.com'),
  });
}

/** Minimal stand-in for the express Response the SDK hands `authorize`. */
function captureRes(): { res: Response; html: () => string } {
  let body = '';
  const res = {
    setHeader: () => undefined,
    send: (chunk: string) => {
      body = chunk;
      return res;
    },
  } as unknown as Response;
  return { res, html: () => body };
}

/** Render the consent page and pull the signed blob out of the form. */
async function consentBlob(
  provider: MailcowOAuthProvider,
  scopes?: string[],
  client: OAuthClientInformationFull = CLIENT,
): Promise<string> {
  const { res, html } = captureRes();
  await provider.authorize(
    client,
    {
      redirectUri: REDIRECT,
      codeChallenge: 'challenge-value',
      state: 'state-value',
      ...(scopes ? { scopes } : {}),
    } as never,
    res,
  );
  const match = /name="pending" value="([^"]+)"/.exec(html());
  if (!match) throw new Error('consent page carried no pending blob');
  return match[1];
}

/** Drive authorize -> consent -> code -> tokens, as the SDK's handlers would. */
async function issueGrant(
  provider: MailcowOAuthProvider,
  scopes?: string[],
  client: OAuthClientInformationFull = CLIENT,
) {
  const blob = await consentBlob(provider, scopes, client);
  const redirect = provider.completeAuthorization(blob, PASSWORD);
  if (!redirect) throw new Error('authorization was not completed');
  const code = new URL(redirect).searchParams.get('code');
  if (!code) throw new Error('no authorization code in the redirect');
  return provider.exchangeAuthorizationCode(client, code);
}

describe('MailcowOAuthProvider', () => {
  describe('revocation covers the grant, not one token', () => {
    it('kills the refresh token when the access token is revoked', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);

      await provider.revokeToken(CLIENT, { token: tokens.access_token });

      // The whole point: without this, the client simply refreshes and the
      // revocation is cosmetic.
      await expect(
        provider.exchangeRefreshToken(CLIENT, tokens.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);
      await expect(provider.verifyAccessToken(tokens.access_token)).rejects.toThrow(
        InvalidTokenError,
      );
      expect(provider.grantCount).toBe(0);
    });

    it('kills the access token when the refresh token is revoked', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);

      await provider.revokeToken(CLIENT, { token: tokens.refresh_token as string });

      await expect(provider.verifyAccessToken(tokens.access_token)).rejects.toThrow(
        InvalidTokenError,
      );
      expect(provider.grantCount).toBe(0);
    });

    it('still covers the grant after the refresh token has rotated', async () => {
      const provider = makeProvider();
      const first = await issueGrant(provider);
      const second = await provider.exchangeRefreshToken(
        CLIENT,
        first.refresh_token as string,
      );

      // Rotation must not start a new grant, or revocation after a refresh
      // would only reach the newest pair.
      expect(provider.grantCount).toBe(1);

      await provider.revokeToken(CLIENT, { token: second.access_token });
      await expect(
        provider.exchangeRefreshToken(CLIENT, second.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);
      expect(provider.grantCount).toBe(0);
    });

    it('treats an unknown token as a no-op, per RFC 7009 section 2.2', async () => {
      const provider = makeProvider();
      await issueGrant(provider);
      await expect(
        provider.revokeToken(CLIENT, { token: 'never-issued' }),
      ).resolves.toBeUndefined();
      expect(provider.grantCount).toBe(1);
    });

    it("ignores a request to revoke another client's token", async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);

      // A public client authenticates with nothing beyond its own client_id,
      // so without this check anyone holding a token value could cut off
      // another client's session. RFC 7009 section 2.1 permits ignoring it.
      await provider.revokeToken(OTHER_CLIENT, { token: tokens.access_token });

      expect(provider.grantCount).toBe(1);
      await expect(provider.verifyAccessToken(tokens.access_token)).resolves.toMatchObject({
        clientId: CLIENT.client_id,
      });
    });

    it('still lets the owning client revoke it', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      await provider.revokeToken(CLIENT, { token: tokens.access_token });
      expect(provider.grantCount).toBe(0);
    });
  });

  describe('scope', () => {
    it('refuses a scope it does not define', async () => {
      const provider = makeProvider();
      const { res } = captureRes();
      await expect(
        provider.authorize(
          CLIENT,
          {
            redirectUri: REDIRECT,
            codeChallenge: 'challenge-value',
            scopes: ['mailcow:read', 'mailcow:root'],
          } as never,
          res,
        ),
      ).rejects.toThrow(InvalidScopeError);
    });

    it('grants the full supported set when the client asks for nothing', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      expect(tokens.scope).toBe([...SUPPORTED_SCOPES].join(' '));
    });

    it('refuses to widen scope on refresh', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider, ['mailcow:read']);
      expect(tokens.scope).toBe('mailcow:read');

      // A read-only client asking for write at refresh time. Allowing this is
      // what makes the scope on the original grant decorative.
      await expect(
        provider.exchangeRefreshToken(CLIENT, tokens.refresh_token as string, [
          'mailcow:read',
          'mailcow:write',
        ]),
      ).rejects.toThrow(InvalidScopeError);
    });

    it('allows narrowing scope on refresh', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      const narrowed = await provider.exchangeRefreshToken(
        CLIENT,
        tokens.refresh_token as string,
        ['mailcow:read'],
      );
      expect(narrowed.scope).toBe('mailcow:read');

      const info = await provider.verifyAccessToken(narrowed.access_token);
      expect(info.scopes).toEqual(['mailcow:read']);
    });

    it('advertises exactly the scopes it enforces', () => {
      expect(makeProvider().scopesSupported).toEqual([...SUPPORTED_SCOPES]);
    });
  });

  describe('grant identity', () => {
    it('exposes the grant id on the verified token', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      const info = await provider.verifyAccessToken(tokens.access_token);
      expect(typeof info.extra?.grantId).toBe('string');
      expect((info.extra?.grantId as string).length).toBeGreaterThan(20);
    });

    it('keeps the grant id stable across a refresh, and distinct between grants', async () => {
      const provider = makeProvider();

      const a1 = await issueGrant(provider);
      const a2 = await provider.exchangeRefreshToken(CLIENT, a1.refresh_token as string);
      const b1 = await issueGrant(provider);

      const idA1 = (await provider.verifyAccessToken(a1.access_token)).extra?.grantId;
      const idA2 = (await provider.verifyAccessToken(a2.access_token)).extra?.grantId;
      const idB1 = (await provider.verifyAccessToken(b1.access_token)).extra?.grantId;

      // Stable across refresh, so the transport can bind a session to it.
      expect(idA2).toBe(idA1);
      // Distinct between authorizations, so that binding means something.
      expect(idB1).not.toBe(idA1);
    });

    it('refuses a refresh token presented by a different client', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      await expect(
        provider.exchangeRefreshToken(OTHER_CLIENT, tokens.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);
    });
  });

  describe('the pending-authorization blob', () => {
    it('rejects a tampered blob', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);

      // Flip a character in the signed payload. The signature no longer covers
      // it, so the parameters coming back are not the ones we sent.
      const body = blob.slice(0, blob.lastIndexOf('.'));
      const mac = blob.slice(blob.lastIndexOf('.'));
      const flipped = (body[0] === 'A' ? 'B' : 'A') + body.slice(1) + mac;

      expect(provider.completeAuthorization(flipped, PASSWORD)).toBeNull();
    });

    it('rejects a signature of the wrong length', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const body = blob.slice(0, blob.lastIndexOf('.'));
      const mac = blob.slice(blob.lastIndexOf('.') + 1);

      // A sha256 digest is exactly 43 base64url characters. Padding or
      // truncating it must not produce a second blob that decodes the same
      // parameters, because anything downstream that treats a blob as an
      // identity would then see two.
      expect(provider.completeAuthorization(`${body}.${mac}A`, PASSWORD)).toBeNull();
      expect(provider.completeAuthorization(`${body}.${mac}==`, PASSWORD)).toBeNull();
      expect(provider.completeAuthorization(`${body}.${mac.slice(0, -1)}`, PASSWORD)).toBeNull();
    });

    it('rejects a signature outside the base64url alphabet', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const body = blob.slice(0, blob.lastIndexOf('.'));
      const mac = blob.slice(blob.lastIndexOf('.') + 1);
      expect(provider.completeAuthorization(`${body}.${mac.slice(0, -1)}*`, PASSWORD)).toBeNull();
    });

    it('rejects a blob with the signature stripped', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const body = blob.slice(0, blob.lastIndexOf('.'));
      expect(provider.completeAuthorization(body, PASSWORD)).toBeNull();
    });

    it('rejects a blob minted by another process', async () => {
      const mine = makeProvider();
      const theirs = makeProvider();
      const blob = await consentBlob(theirs);
      // The signing key is per-process, so a blob from elsewhere is not valid
      // here even though both instances share the operator password.
      expect(mine.completeAuthorization(blob, PASSWORD)).toBeNull();
    });

    it('rejects a valid blob with the wrong password', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      expect(provider.completeAuthorization(blob, 'not-the-password')).toBeNull();
    });

    it('accepts its own blob with the right password', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const redirect = provider.completeAuthorization(blob, PASSWORD);
      expect(redirect).toContain(REDIRECT);
      expect(new URL(redirect as string).searchParams.get('state')).toBe('state-value');
    });
  });

  describe('one approval mints one code', () => {
    it('refuses to redeem the same consent approval twice', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);

      const first = provider.completeAuthorization(blob, PASSWORD);
      const second = provider.completeAuthorization(blob, PASSWORD);

      expect(first).toContain(REDIRECT);
      // Without this, the ten minutes the blob lives are a window in which the
      // same approval can be replayed for an unlimited number of independent
      // grants, each with its own refresh token and its own 30 day deadline.
      // They survive revoking the grant the client knows about, because they
      // are different grants, and they show up in no client UI. A browser form
      // resubmission is enough to create one.
      expect(second).toBeNull();
    });

    it('yields exactly one usable grant per approval', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);

      const redirect = provider.completeAuthorization(blob, PASSWORD);
      const code = new URL(redirect as string).searchParams.get('code') as string;
      await provider.exchangeAuthorizationCode(CLIENT, code);

      expect(provider.completeAuthorization(blob, PASSWORD)).toBeNull();
      expect(provider.grantCount).toBe(1);
    });
  });

  describe('refresh token reuse', () => {
    it('revokes the whole grant when a rotated token is presented again', async () => {
      const provider = makeProvider();
      const first = await issueGrant(provider);
      const second = await provider.exchangeRefreshToken(
        CLIENT,
        first.refresh_token as string,
      );

      // Rotation alone cannot tell a client retry from a stolen token. Reuse is
      // the only signal that two parties hold the chain, so OAuth 2.1 and
      // RFC 9700 4.14.2 require killing the grant. Without it the thief keeps
      // refreshing for the remaining 30 days while the legitimate client
      // re-authorizes and sees nothing worse than one unexpected sign-in.
      await expect(
        provider.exchangeRefreshToken(CLIENT, first.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);

      expect(provider.grantCount).toBe(0);
      await expect(
        provider.exchangeRefreshToken(CLIENT, second.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);
      await expect(provider.verifyAccessToken(second.access_token)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('does not resurrect a grant that no longer exists', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      const rotated = await provider.exchangeRefreshToken(
        CLIENT,
        tokens.refresh_token as string,
      );

      await provider.revokeToken(CLIENT, { token: rotated.access_token });
      expect(provider.grantCount).toBe(0);

      // The rotation path must refuse rather than fall through to first
      // issuance, which would mint a replacement grant carrying a renewed
      // 30 day deadline and falsify the one invariant a grant exists for.
      await expect(
        provider.exchangeRefreshToken(CLIENT, rotated.refresh_token as string),
      ).rejects.toThrow(InvalidGrantError);
      expect(provider.grantCount).toBe(0);
    });

    it('treats a narrowed scope as the new ceiling for the grant', async () => {
      const provider = makeProvider();
      const tokens = await issueGrant(provider);
      const narrowed = await provider.exchangeRefreshToken(
        CLIENT,
        tokens.refresh_token as string,
        ['mailcow:read'],
      );
      expect(narrowed.scope).toBe('mailcow:read');

      // Narrowing must not be walkable back up on the next refresh.
      await expect(
        provider.exchangeRefreshToken(CLIENT, narrowed.refresh_token as string, [
          'mailcow:write',
        ]),
      ).rejects.toThrow(InvalidScopeError);
    });
  });

  describe('redirect_uri binding at token exchange', () => {
    it('refuses a redirect_uri that does not match the authorization request', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const redirect = provider.completeAuthorization(blob, PASSWORD);
      const code = new URL(redirect as string).searchParams.get('code') as string;

      // RFC 6749 4.1.3. PKCE already binds the code to the client instance, so
      // this is a second layer, which is exactly why it should be present: it
      // is what still holds if PKCE is ever weakened.
      await expect(
        provider.exchangeAuthorizationCode(
          CLIENT,
          code,
          'verifier',
          'https://attacker.example/callback',
        ),
      ).rejects.toThrow(InvalidGrantError);
    });

    it('accepts the redirect_uri it issued the code for', async () => {
      const provider = makeProvider();
      const blob = await consentBlob(provider);
      const redirect = provider.completeAuthorization(blob, PASSWORD);
      const code = new URL(redirect as string).searchParams.get('code') as string;

      const tokens = await provider.exchangeAuthorizationCode(
        CLIENT,
        code,
        'verifier',
        REDIRECT,
      );
      expect(tokens.access_token).toBeTruthy();
    });
  });

  describe('resource indicators (RFC 8707)', () => {
    it('refuses to issue a token for a resource it does not serve', async () => {
      const provider = makeProvider();
      const { res } = captureRes();

      // Left unchecked, the audience recorded on the token is whatever the
      // caller asked for, and any downstream consumer would reasonably trust
      // it as the audience this token is valid for.
      await expect(
        provider.authorize(
          CLIENT,
          {
            redirectUri: REDIRECT,
            codeChallenge: 'challenge-value',
            resource: new URL('https://totally-other-server.example/mcp'),
          } as never,
          res,
        ),
      ).rejects.toThrow(InvalidTargetError);
    });

    it('accepts a resource on its own origin, including a sub-path', async () => {
      const provider = makeProvider();
      const { res, html } = captureRes();
      await provider.authorize(
        CLIENT,
        {
          redirectUri: REDIRECT,
          codeChallenge: 'challenge-value',
          // Clients legitimately send either the origin or the MCP endpoint
          // path beneath it, so the comparison is by origin.
          resource: new URL('https://mcp.example.com/mcp'),
        } as never,
        res,
      );
      expect(html()).toContain('name="pending"');
    });
  });

  describe('bounds on what an unauthenticated caller can store', () => {
    it('truncates an oversized client name', async () => {
      const provider = makeProvider();
      const registered = await provider.clientsStore.registerClient!({
        client_id: 'fat-client',
        client_name: 'A'.repeat(900_000),
        redirect_uris: [REDIRECT],
      } as OAuthClientInformationFull);

      expect((registered.client_name as string).length).toBeLessThanOrEqual(64);
    });

    it('keeps an oversized name out of the consent page', async () => {
      const provider = makeProvider();
      const registered = await provider.clientsStore.registerClient!({
        client_id: 'fat-client',
        client_name: 'A'.repeat(900_000),
        redirect_uris: [REDIRECT],
      } as OAuthClientInformationFull);

      const { res, html } = captureRes();
      await provider.authorize(
        registered,
        { redirectUri: REDIRECT, codeChallenge: 'challenge-value' } as never,
        res,
      );

      // One unauthenticated GET must not return most of a megabyte of
      // attacker-supplied text, and the page must stay small enough that the
      // destination box is actually on screen.
      expect(html().length).toBeLessThan(20_000);
    });

    it('shows the destination before anything the client chose', async () => {
      const provider = makeProvider();
      const registered = await provider.clientsStore.registerClient!({
        client_id: 'lookalike',
        client_name: 'Claude',
        redirect_uris: ['https://evil.example/cb'],
      } as OAuthClientInformationFull);

      const { res, html } = captureRes();
      await provider.authorize(
        registered,
        { redirectUri: 'https://evil.example/cb', codeChallenge: 'c' } as never,
        res,
      );
      const page = html();

      // The destination is the only field an attacker cannot forge, so it must
      // come first. Rendering the client's self-chosen name above it let a
      // long name push the real destination off the screen.
      expect(page.indexOf('dest-origin')).toBeLessThan(page.indexOf('lookalike') === -1 ? page.indexOf('Claude') : page.indexOf('lookalike'));
      expect(page).toContain('https://evil.example');
    });

    it('does not autofocus the password field', async () => {
      const provider = makeProvider();
      const { res, html } = captureRes();
      await provider.authorize(
        CLIENT,
        { redirectUri: REDIRECT, codeChallenge: 'c' } as never,
        res,
      );
      // Autofocus made the browser scroll straight to the form, past both
      // warnings and past the destination box.
      expect(html()).not.toContain('autofocus');
    });

    it('caps how many registrations it retains', async () => {
      const provider = makeProvider();
      for (let i = 0; i < 150; i++) {
        await provider.clientsStore.registerClient!({
          client_id: `client-${i}`,
          client_name: `client ${i}`,
          redirect_uris: [REDIRECT],
        } as OAuthClientInformationFull);
      }
      // Registration is open to the internet and nothing prunes it otherwise,
      // so the ceiling is the only thing between a stranger and the heap.
      expect(provider.clientCount).toBeLessThanOrEqual(100);
    });

    it('never evicts a client that holds a live grant', async () => {
      const provider = makeProvider();
      // The grant helpers call authorize() directly, as the SDK does after it
      // has looked the client up, so the client has to be in the store for an
      // eviction test to mean anything.
      await provider.clientsStore.registerClient!({ ...CLIENT } as OAuthClientInformationFull);
      await issueGrant(provider);
      expect(provider.grantCount).toBe(1);

      for (let i = 0; i < 150; i++) {
        await provider.clientsStore.registerClient!({
          client_id: `filler-${i}`,
          client_name: `filler ${i}`,
          redirect_uris: [REDIRECT],
        } as OAuthClientInformationFull);
      }

      // Otherwise registering in a loop evicts the operator's working client
      // and breaks their session from the outside.
      await expect(provider.clientsStore.getClient(CLIENT.client_id)).resolves.toMatchObject({
        client_id: CLIENT.client_id,
      });
    });

    it('keeps a seeded client even after its last grant is revoked', async () => {
      const provider = makeProvider();
      // A client the operator configured, rather than one registered over the
      // network. ChatGPT is given credentials this way.
      provider.seedClient({ ...CLIENT } as OAuthClientInformationFull);

      const tokens = await issueGrant(provider);
      await provider.revokeToken(CLIENT, { token: tokens.access_token });
      expect(provider.grantCount).toBe(0);

      // Revoking the last grant used to remove the only protection a seeded
      // client had, which left the operator's configured client evictable by
      // unauthenticated registration traffic: it silently disappears and the
      // vendor can no longer authenticate.
      for (let i = 0; i < 150; i++) {
        await provider.clientsStore.registerClient!({
          client_id: `churn-${i}`,
          client_name: `churn ${i}`,
          redirect_uris: [REDIRECT],
        } as OAuthClientInformationFull);
      }

      await expect(provider.clientsStore.getClient(CLIENT.client_id)).resolves.toMatchObject({
        client_id: CLIENT.client_id,
      });
    });

    it('drops unbounded fields it never reads', async () => {
      const provider = makeProvider();
      const registered = await provider.clientsStore.registerClient!({
        client_id: 'verbose',
        client_name: 'ok',
        redirect_uris: [REDIRECT],
        software_statement: 'B'.repeat(500_000),
        logo_uri: 'https://example.com/' + 'c'.repeat(5000),
      } as unknown as OAuthClientInformationFull);

      expect(registered.software_statement).toBeUndefined();
      expect(registered.logo_uri).toBeUndefined();
    });

    it('caps how many redirect URIs it keeps', async () => {
      const provider = makeProvider();
      const registered = await provider.clientsStore.registerClient!({
        client_id: 'many-uris',
        client_name: 'ok',
        redirect_uris: Array.from({ length: 50 }, (_, i) => `https://example.com/cb${i}`),
      } as OAuthClientInformationFull);

      expect(registered.redirect_uris.length).toBeLessThanOrEqual(10);
    });
  });

  describe('grant revocation notifies the transport', () => {
    it('reports the revoked grant id so bound sessions can be closed', async () => {
      const revoked: string[] = [];
      const provider = new MailcowOAuthProvider({
        operatorPassword: PASSWORD,
        issuerUrl: new URL('https://mcp.example.com'),
        onGrantRevoked: (id) => revoked.push(id),
      });

      const tokens = await issueGrant(provider);
      const grantId = (await provider.verifyAccessToken(tokens.access_token)).extra
        ?.grantId as string;

      await provider.revokeToken(CLIENT, { token: tokens.access_token });

      // Without this the session object stays resident after revocation, and
      // an event stream opened beforehand keeps being served, because bearer
      // auth is checked per request rather than per message.
      expect(revoked).toContain(grantId);
    });
  });

  describe('construction', () => {
    it('refuses to start without a password', () => {
      expect(
        () =>
          new MailcowOAuthProvider({
            operatorPassword: '',
            issuerUrl: new URL('https://mcp.example.com'),
          }),
      ).toThrow(/MCP_OAUTH_PASSWORD/);
    });

    it('refuses a short password', () => {
      expect(
        () =>
          new MailcowOAuthProvider({
            operatorPassword: 'short',
            issuerUrl: new URL('https://mcp.example.com'),
          }),
      ).toThrow(/24 characters/);
    });
  });
});
