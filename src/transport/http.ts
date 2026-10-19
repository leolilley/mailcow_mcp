/**
 * Streamable HTTP transport
 *
 * Serves the MCP server over HTTP so it can be used as a remote MCP server by
 * Claude (web and desktop) and ChatGPT. Both require a public HTTPS endpoint
 * speaking Streamable HTTP, and neither can send a static bearer header, hence
 * the OAuth endpoints mounted alongside.
 *
 * This module deliberately does not terminate TLS. Run it behind a reverse
 * proxy that does, and bind it to loopback. A mail-administration endpoint
 * should not be the thing parsing TLS from the open internet.
 *
 * Where availability is defended, and where it is not
 * ---------------------------------------------------
 * Two of the endpoints here are reached by the *operator's browser*
 * (`/authorize` and the consent POST). The rest are reached by the *vendor's
 * backend* (`/token`, `/register`, `/mcp`, the metadata documents). That split
 * matters more than it looks, because nothing inside this process can tell the
 * operator from an attacker: `/authorize` needs no authentication, dynamic
 * client registration is open, and any token this process could hand the
 * operator an attacker can request too.
 *
 * So every in-process mechanism that bounds an attacker also bounds the
 * operator, and the only question is which failure you prefer. Three versions
 * of this file got that wrong in three different ways:
 *
 *   - It inherited the SDK's 429 limiter on the whole `/authorize` subtree.
 *     100 unauthenticated GETs, and the operator can never render a consent
 *     page again.
 *   - It then moved the consent POST out of that subtree and called the
 *     ordering load-bearing. It was not: the POST is useless without a blob,
 *     and the blob comes from `GET /authorize`, which was still behind the
 *     limiter. The lockout was untouched.
 *   - It then shed over-budget submissions with a 503 decided before the
 *     password was read. Password-independent, so not an oracle, but eight
 *     *aborted* POSTs cost an attacker no open sockets at all and answered the
 *     operator's correct password with a 503 in two milliseconds.
 *
 * What this file does now: it refuses nobody on the operator path. No 429, no
 * 503, no dropped socket. Guessing is bounded by serialising the password
 * checks, so a guess costs wall-clock time on a single global slot. Volumetric
 * abuse is bounded at the reverse proxy, which is the only layer that can see
 * a source address worth keying on, and the operator-facing paths are expected
 * to be restricted there to the operator rather than to the vendor ranges.
 * `docs/REMOTE_DEPLOYMENT.md` sets out the two allowlists that implies.
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { CONSENT_SUBMIT_PATH, type MailcowOAuthProvider } from '../auth/oauth-provider.js';
import type { Logger } from '../utils/logger.js';

/**
 * Factory for the MCP protocol object.
 *
 * A `Server` instance can be connected to exactly one transport: the second
 * `connect()` throws `Already connected to a transport`. Since each MCP session
 * gets its own transport, each session needs its own `Server`, or the server
 * serves one client and rejects every other.
 *
 * Only the protocol object is per-session. The tool registry, API client and
 * configuration behind it are shared, which is what you want: the sessions are
 * separate conversations against the same mailcow.
 */
export type McpServerFactory = () => Server | Promise<Server>;

export interface HttpTransportOptions {
  host: string;
  port: number;
  /** Public origin this server is reached at, e.g. https://mail.example.com */
  publicUrl: URL;
  provider: MailcowOAuthProvider;
  logger: Logger;
  /** Trust X-Forwarded-* headers. Enable only when behind a known proxy. */
  trustProxy: boolean;
  /** Max JSON body size on /mcp. Mail admin payloads are small. */
  maxBodyBytes?: number;
}

/** Minimum spacing between two password checks, doubling per failure. */
const CONSENT_BASE_INTERVAL_MS = 1000;
/** Ceiling on that spacing. */
const CONSENT_MAX_INTERVAL_MS = 30_000;
/** Failures stop counting towards the interval once the window has passed. */
const CONSENT_FAILURE_WINDOW_MS = 15 * 60 * 1000;
/**
 * How many submissions may be waiting for a check slot.
 *
 * Past this a submission is refused without its password being read. That is
 * an availability trade, and it is deliberate this time rather than
 * accidental: see the note on handleConsentSubmission.
 *
 * The alternative that was tried and must not come back: checking immediately
 * once the queue grew past a time ceiling. That reads like a graceful
 * degradation and is a complete bypass. Submissions that skip the queue do not
 * advance the cursor either, so once an attacker pushes it past the ceiling,
 * every subsequent guess is checked at once, concurrently, with no spacing at
 * all. It removed the bound it was meant to soften.
 */
const CONSENT_MAX_QUEUE = 8;


/** Idle MCP sessions are closed after this long without a request. */
const SESSION_IDLE_MS = 30 * 60 * 1000;
/** How often to look for idle sessions. */
const SESSION_SWEEP_MS = 5 * 60 * 1000;
/** Hard ceiling on concurrent MCP sessions. */
const MAX_SESSIONS = 64;
/** Longest `stop()` waits for in-flight work before forcing sockets shut. */
const SHUTDOWN_GRACE_MS = 5000;

interface McpSession {
  transport: StreamableHTTPServerTransport;
  /** This session's own protocol object. Closed with the session. */
  server: Server;
  /**
   * The grant that opened the session.
   *
   * Sessions are bound to the grant rather than to the access token, because
   * the token rotates hourly and the session should survive that. Binding to
   * something is the point: a session id is a bearer capability on its own, so
   * without this check any valid token could attach to any live session.
   */
  grantId?: string;
  clientId: string;
  lastSeenAt: number;
}

/** The SDK's bearer middleware attaches this. Not in Express's own types. */
type AuthedRequest = Request & { auth?: AuthInfo };

function authOf(req: Request): AuthInfo | undefined {
  return (req as AuthedRequest).auth;
}

function grantIdOf(auth: AuthInfo | undefined): string | undefined {
  const value = auth?.extra?.grantId;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Short, stable tag for a session id in logs.
 *
 * A session id is a bearer capability, so logging it in full means log access
 * plus any valid token is a session takeover.
 */
function sessionTag(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 12);
}

/** Minimum interval between password checks, by failure count in the window. */
export function consentIntervalFor(failures: number): number {
  const exponent = Math.min(Math.max(failures, 1) - 1, 10);
  return Math.min(CONSENT_BASE_INTERVAL_MS * 2 ** exponent, CONSENT_MAX_INTERVAL_MS);
}

type HostState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';

/**
 * One transport, and one `Server`, per MCP session.
 *
 * Streamable HTTP is session-oriented: the client initializes once, receives a
 * session id, and sends subsequent requests with that id.
 */
export class HttpTransportHost {
  private readonly app: Express;
  private readonly sessions = new Map<string, McpSession>();
  private httpServer?: ReturnType<Express['listen']>;
  private state: HostState = 'idle';
  private startPromise?: Promise<void>;

  private consentFailures = 0;
  private consentWindowStartedAt = 0;
  /** Submissions waiting for, or holding, the check slot. */
  private consentQueueDepth = 0;
  /**
   * Tail of the chain that serialises password checks.
   *
   * Deliberately a promise chain and not a timestamp cursor. Four versions of
   * this used clock arithmetic and three of them were wrong in ways that took
   * a reviewer to see: a wait ceiling that let submissions skip the queue
   * without advancing the cursor (so one flood made every later guess free), a
   * rollback that only covered the newest reservation (so abandoning the
   * oldest pushed the cursor forward without limit), and then a clamp on how
   * far ahead the cursor could sit (which made clamped slots land on top of
   * each other, so checks that should have been spaced coincided).
   *
   * A chain has no absolute time in it to inflate or clamp. Each submission
   * waits for everything ahead of it, runs its check, and then holds the chain
   * open for one interval so the next check is spaced. Exactly one check per
   * interval, and nothing to get arithmetically wrong.
   */
  private consentChain: Promise<void> = Promise.resolve();
  /**
   * The submission currently holding the chain open for its interval.
   *
   * Kept apart from the waiters below, and that separation is the point. A
   * successful authorization should skip the *remaining* interval, which means
   * releasing this one link. Releasing the waiters as well, which an earlier
   * version did, resolves their holds before their turn has come, so every
   * queued guess is then checked back to back with no spacing: a burst of free
   * attempts handed out by the operator's own success.
   */
  private consentHolder?: { timer: NodeJS.Timeout; release: () => void };
  /** Submissions waiting for their turn, so shutdown can let them go. */
  private readonly consentWaiters = new Set<{ abandon: (reason: 'shutdown') => void }>();
  private sessionSweeper?: NodeJS.Timeout;

  constructor(
    private readonly createMcpServer: McpServerFactory,
    private readonly options: HttpTransportOptions,
  ) {
    this.app = express();
    this.configure();
  }

  private configure(): void {
    const { provider, publicUrl, logger, trustProxy } = this.options;

    // Behind a reverse proxy the client IP and protocol arrive in headers.
    // Trusting them unconditionally would let a direct caller spoof both, so
    // this is opt-in and should be paired with binding to loopback.
    this.app.set('trust proxy', trustProxy ? 1 : false);
    this.app.disable('x-powered-by');

    // Security headers go on BEFORE the body parsers. Registered after them, a
    // parser error short-circuits straight to the error handler and the
    // response carries none of these, which is exactly the class of response
    // the error handler exists for.
    this.app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'no-store');
      // The one HTML page has no scripts and no external assets, so this costs
      // nothing.
      //
      // Deliberately WITHOUT form-action. It was set to 'self' here, which
      // read like free hardening and silently broke the entire authorization
      // flow: browsers enforce form-action against the whole redirect chain,
      // not just the form's immediate target, so the 302 carrying the
      // authorization code to the client was blocked as a cross-origin form
      // navigation. The server minted a valid code every time and the browser
      // never arrived, which looks exactly like a wrong password.
      //
      // It cannot be fixed by listing origins either: the redirect target is
      // whatever redirect_uri a client registered, so any allowlist wide
      // enough to work is wide enough to be meaningless. What actually guards
      // this flow is the destination shown on the consent page, the
      // single-use approval and PKCE.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      );
      next();
    });

    // The large JSON limit belongs to /mcp alone. Mounted globally it also
    // raised the limit on the unauthenticated registration endpoint, because
    // the body was already parsed by the time the SDK's own tighter parser
    // ran, turning registration into a way to park a megabyte per request.
    const mcpJson = express.json({ limit: this.options.maxBodyBytes ?? 1_000_000 });
    const consentForm = express.urlencoded({ extended: false, limit: 64_000 });

    // --- Consent submission ----------------------------------------------
    this.app.post(CONSENT_SUBMIT_PATH, consentForm, (req: Request, res: Response) => {
      // Explicitly caught: this is the only route that handles the password,
      // and an unhandled rejection here would take the process down along with
      // every live session.
      this.handleConsentSubmission(req, res).catch((error: unknown) => {
        logger.error('Consent submission failed', error as Error);
        if (!res.headersSent) {
          res.status(500).type('text/plain').send('Authorization failed');
        }
      });
    });

    // --- OAuth 2.1 -------------------------------------------------------
    //
    // Every SDK limiter is turned off, on purpose.
    //
    // They are `express-rate-limit` keyed on `req.ip` and they answer 429. With
    // `trust proxy` off behind a proxy, which is both the default and the
    // documented deployment, `req.ip` is the proxy's address for every request
    // on earth, so each limiter is a single global bucket that any one caller
    // drains: 100 requests per 15 minutes locks the operator out of
    // `/authorize`, and 20 per hour locks the vendor out of `/register`, after
    // which no client can be added at all.
    //
    // Nothing is lost by removing them. `/authorize` is a stateless render,
    // registration is bounded by the clients store's own ceiling and
    // truncation rather than by request count, and password guessing is
    // bounded by the serialised check below. Volumetric abuse is the reverse
    // proxy's job, because the proxy is the only layer here that can see a
    // source address worth keying on.
    this.app.use(
      mcpAuthRouter({
        provider,
        issuerUrl: publicUrl,
        resourceServerUrl: publicUrl,
        resourceName: 'mailcow MCP',
        scopesSupported: provider.scopesSupported,
        authorizationOptions: { rateLimit: false },
        clientRegistrationOptions: { rateLimit: false },
        tokenOptions: { rateLimit: false },
        revocationOptions: { rateLimit: false },
      }),
    );

    // --- Liveness --------------------------------------------------------
    // Unauthenticated on purpose: it reveals nothing and the container
    // healthcheck needs it. It must never grow a body that says anything
    // about configuration.
    this.app.get('/healthz', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // --- MCP -------------------------------------------------------------
    //
    // No `requiredScopes` here on purpose. Scope is enforced per tool, where
    // the read/write distinction actually lives, so a client that holds only
    // one of the two scopes still connects and simply cannot call the tools it
    // was not granted.
    //
    // The resource metadata URL is derived with the SDK's own helper, because
    // the SDK mounts that document under the public URL's path. Building it
    // from the origin alone advertised a URL that 404s for any deployment with
    // a path prefix, which is a documented configuration.
    const auth = requireBearerAuth({
      verifier: provider,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(publicUrl),
    });

    this.app.post('/mcp', auth, mcpJson, (req, res) => void this.handlePost(req, res));
    this.app.get('/mcp', auth, (req, res) => void this.handleSessionRequest(req, res));
    this.app.delete('/mcp', auth, (req, res) => void this.handleSessionRequest(req, res));
    // Anything else on /mcp is a method error, not a missing route.
    this.app.all('/mcp', (_req, res) => {
      res.setHeader('Allow', 'GET, POST, DELETE');
      res.status(405).json(jsonRpcError(-32000, 'Method not allowed'));
    });

    // Anything else is not part of the contract.
    this.app.use((_req, res) => {
      res.status(404).type('text/plain').send('Not found');
    });

    // --- Errors ----------------------------------------------------------
    //
    // Last, so it catches everything above, including the body parsers: a
    // malformed JSON body or one over the size limit throws here rather than
    // reaching a route.
    //
    // Express's default handler prints the stack when NODE_ENV is unset. The
    // container sets it to production, which makes the leak conditional on
    // deployment rather than absent, so the stack is dropped unconditionally
    // instead of trusting an environment variable to be right.
    this.app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
      const error = err instanceof Error ? err : new Error(String(err));
      const status = statusOf(err);

      logger.error('Request failed', error, { path: req.path, method: req.method, status });

      if (res.headersSent) {
        res.end();
        return;
      }
      // Set again here rather than relying on the middleware above, so these
      // hold even if the ordering is changed later.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      // Nothing from the error object goes to the client, not the message and
      // not the stack. A caller learns the shape of its own mistake from the
      // status code.
      if (req.path === '/mcp') {
        res.status(status).json(jsonRpcError(-32700, 'Invalid request'));
      } else {
        res.status(status).type('text/plain').send('Invalid request');
      }
    });
  }

  /**
   * Handle a consent submission under a global check-rate limit.
   *
   * Four properties, each replacing a mistake made here before:
   *
   *   1. The throttle limits how often a password is *checked*, not how long
   *      the answer takes. Delaying only the answer leaves the check running at
   *      full speed, and the verdict is what an attacker is after.
   *   2. A submission past the queue bound is refused, and the refusal is
   *      decided on queue depth alone, before the password is read, so it
   *      cannot be read as a verdict. This is an availability trade and it is
   *      the honest one: the two alternatives both failed. Checking
   *      immediately past a time ceiling removed the bound entirely, because
   *      skipping submissions never advance the cursor, so one flood made
   *      every later guess free. Holding every submission regardless of depth
   *      makes the queue itself the resource to exhaust. What makes the
   *      refusal acceptable now is property 4: a caller that hangs up gives
   *      its slot back, so filling this queue costs an attacker a held
   *      connection per slot rather than an aborted request. Bound those at
   *      the proxy, and restrict the operator-facing paths there too.
   *   3. A correct password waits its turn like any other. Letting it skip the
   *      queue is what turned saturation into a fast negative oracle.
   *   4. A caller that disconnects releases its slot. Without that, a slot was
   *      held for its full reserved interval by a request nobody was waiting
   *      on, which is what made the aborted-POST attack free.
   */
  private async handleConsentSubmission(req: Request, res: Response): Promise<void> {
    const { provider, logger } = this.options;
    const { pending, password } = req.body ?? {};
    if (typeof pending !== 'string' || typeof password !== 'string') {
      res.status(400).type('text/plain').send('Malformed authorization request');
      return;
    }

    if (this.consentQueueDepth >= CONSENT_MAX_QUEUE) {
      // Decided on depth alone. The password has not been looked at, so this
      // response carries no information about it.
      logger.warn('Authorization submission refused; check queue is full', {
        ip: req.ip,
        queued: this.consentQueueDepth,
      });
      res.status(503).type('text/plain').send('Try again shortly');
      return;
    }

    this.consentQueueDepth += 1;
    let outcome: 'ok' | 'gone' | 'shutdown';
    try {
      outcome = await this.awaitConsentSlot(req);
    } finally {
      this.consentQueueDepth -= 1;
    }
    if (outcome === 'gone') {
      // The caller hung up while waiting. Nothing to answer.
      return;
    }
    if (outcome === 'shutdown') {
      // Never checked, so this says nothing about the password.
      if (!res.headersSent) {
        res.status(503).type('text/plain').send('Server is shutting down');
      }
      return;
    }

    const redirectTo = provider.completeAuthorization(pending, password);

    if (redirectTo) {
      // Only a correct password clears the throttle, and guessing cannot
      // produce one. Skipping the *remaining* interval matters as much as
      // zeroing the count, because an interval is fixed when its link is
      // scheduled: without this the operator queues behind a thirty-second
      // hold reserved by a guessing run that has just been proven irrelevant.
      //
      // Only the link currently holding the chain is released. Releasing the
      // waiters too would resolve their holds before their turn had come, so
      // every queued guess would then be checked back to back with no
      // spacing, which is a burst of free attempts handed out by this very
      // success.
      this.consentFailures = 0;
      this.consentHolder?.release();
      logger.info('Authorization granted', { ip: req.ip });
      if (!res.headersSent) res.redirect(302, redirectTo);
      return;
    }

    // Identical for a bad password, a tampered blob and an expired consent
    // page. The caller does not learn which.
    this.registerConsentFailure();
    logger.warn('Authorization attempt rejected', {
      ip: req.ip,
      failures: this.consentFailures,
    });
    if (!res.headersSent) {
      res.status(401).type('text/plain').send('Authorization failed');
    }
  }

  /**
   * Wait until this submission's turn to be checked.
   *
   * Returns why it stopped waiting. A caller that disconnects, or a shutdown,
   * gives up its place immediately rather than making the next submission wait
   * out an interval for a request nobody is listening to. That is what stops a
   * run of aborted POSTs, which cost an attacker nothing, from filling the
   * queue and having every later submission refused.
   *
   * The spacing comes from the failure count, which is global for the window
   * because any per-caller key is resettable: `/authorize` is unauthenticated
   * and registration is open, so a fresh consent page per guess resets
   * anything keyed to the page.
   */
  private async awaitConsentSlot(req: Request): Promise<'ok' | 'gone' | 'shutdown'> {
    const now = Date.now();
    if (now - this.consentWindowStartedAt > CONSENT_FAILURE_WINDOW_MS) {
      this.consentWindowStartedAt = now;
      this.consentFailures = 0;
    }

    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    const ahead = this.consentChain;
    // Append first, so concurrent submissions order behind one another rather
    // than all reading the same tail.
    this.consentChain = ahead.then(() => held);

    // Raced against the wait, not checked after it. A submission parked until
    // its turn came went on occupying a queue slot for the whole time the
    // submissions ahead of it were being spaced out, which kept the queue at
    // its bound and had every later submission refused.
    let abandon!: (reason: 'gone' | 'shutdown') => void;
    const abandoned = new Promise<'gone' | 'shutdown'>((resolve) => {
      abandon = resolve;
    });
    const waiter = { abandon: (reason: 'shutdown'): void => abandon(reason) };
    this.consentWaiters.add(waiter);

    const onGone = (): void => abandon('gone');
    const res = req.res;
    const onClose = (): void => {
      if (!res || !res.writableEnded) abandon('gone');
    };
    req.on('aborted', onGone);
    res?.on('close', onClose);

    try {
      const outcome = await Promise.race([ahead.then(() => 'ok' as const), abandoned]);

      if (outcome !== 'ok') {
        // Release at once, so this submission costs the next one nothing. The
        // chain still runs through this link; it simply holds no interval.
        release();
        return outcome;
      }

      // Hold the chain for one interval, so the next check is spaced from this
      // one. The check itself happens in the caller, immediately after this
      // returns.
      const interval = consentIntervalFor(this.consentFailures + 1);
      const holder = {
        timer: setTimeout(() => {
          if (this.consentHolder === holder) this.consentHolder = undefined;
          release();
        }, interval),
        release: (): void => {
          clearTimeout(holder.timer);
          if (this.consentHolder === holder) this.consentHolder = undefined;
          release();
        },
      };
      this.consentHolder = holder;
      return 'ok';
    } finally {
      this.consentWaiters.delete(waiter);
      req.off('aborted', onGone);
      res?.off('close', onClose);
    }
  }

  private registerConsentFailure(): void {
    const now = Date.now();
    if (now - this.consentWindowStartedAt > CONSENT_FAILURE_WINDOW_MS) {
      this.consentWindowStartedAt = now;
      this.consentFailures = 0;
    }
    this.consentFailures += 1;
  }

  /** Exposed for tests: failed authorizations counted in the current window. */
  get consentFailureCount(): number {
    return this.consentFailures;
  }

  /** Exposed for tests: submissions currently waiting for a check slot. */
  get consentQueueLength(): number {
    return this.consentQueueDepth;
  }



  /**
   * Check that the caller owns the session it names.
   *
   * A session id travels in a plain header and is a capability by itself, so
   * without this any authenticated caller could drive any live session:
   * an attacker holding a token from a separate authorization resuming someone
   * else's conversation and reading its results.
   *
   * Fails closed. An earlier version fell back to comparing client ids when
   * either side lacked a grant id, which would make two separate
   * authorizations of the same registered client interchangeable.
   */
  private ownsSession(session: McpSession, auth: AuthInfo | undefined): boolean {
    if (!auth) return false;
    if (session.grantId) return session.grantId === grantIdOf(auth);
    return session.clientId === auth.clientId;
  }

  /** Close every session opened under a grant that has just been revoked. */
  closeSessionsForGrant(grantId: string): void {
    for (const [id, session] of this.sessions) {
      if (session.grantId !== grantId) continue;
      this.sessions.delete(id);
      this.options.logger.info('Closing session for revoked grant', {
        session: sessionTag(id),
      });
      void this.closeSession(session);
    }
  }

  private async closeSession(session: McpSession): Promise<void> {
    try {
      await session.transport.close();
    } catch {
      /* best effort */
    }
    try {
      await session.server.close();
    } catch {
      /* best effort */
    }
  }

  /**
   * Close sessions that have gone quiet.
   *
   * A session is only removed otherwise when its transport closes, which needs
   * the client to send DELETE or drop the connection. Claude and ChatGPT open a
   * session per conversation and are not obliged to delete it, so without this
   * the map grows for the life of the process in normal use, each entry holding
   * its own protocol object and handler set.
   */
  private sweepSessions(): void {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, session] of this.sessions) {
      if (session.lastSeenAt > cutoff) continue;
      this.sessions.delete(id);
      this.options.logger.info('Closing idle MCP session', {
        session: sessionTag(id),
        sessions: this.sessions.size,
      });
      void this.closeSession(session);
    }
  }

  private async handlePost(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const auth = authOf(req);

    try {
      const existing = sessionId ? this.sessions.get(sessionId) : undefined;

      if (existing) {
        if (!this.ownsSession(existing, auth)) {
          this.options.logger.warn('Rejected cross-grant session access', {
            session: sessionTag(sessionId as string),
            clientId: auth?.clientId,
          });
          // 404 rather than 403: a caller that does not own the session should
          // not learn that it exists.
          res.status(404).json(jsonRpcError(-32001, 'Unknown session'));
          return;
        }
        existing.lastSeenAt = Date.now();
        await existing.transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId) {
        res.status(404).json(jsonRpcError(-32001, 'Unknown session'));
        return;
      }
      if (!isInitializeRequest(req.body)) {
        res.status(400).json(jsonRpcError(-32000, 'First request must be initialize'));
        return;
      }
      if (this.sessions.size >= MAX_SESSIONS) {
        // Try to make room before refusing.
        this.sweepSessions();
      }
      if (this.sessions.size >= MAX_SESSIONS) {
        this.options.logger.warn('Refusing new MCP session; at capacity', {
          sessions: this.sessions.size,
        });
        res.status(503).json(jsonRpcError(-32000, 'Server at session capacity'));
        return;
      }

      // New session: its own protocol object, its own transport.
      const server = await this.createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id): void => {
          this.sessions.set(id, {
            transport,
            server,
            grantId: grantIdOf(auth),
            clientId: auth?.clientId ?? 'unknown',
            lastSeenAt: Date.now(),
          });
          this.options.logger.info('MCP session initialized', {
            session: sessionTag(id),
            clientId: auth?.clientId,
            sessions: this.sessions.size,
          });
        },
      });

      transport.onclose = (): void => {
        const id = transport.sessionId;
        if (id) this.sessions.delete(id);
        // The per-session Server goes with it. Left open, each closed session
        // would leak a protocol object and its handlers.
        void server.close().catch(() => {
          /* best effort */
        });
        if (id) {
          this.options.logger.info('MCP session closed', {
            session: sessionTag(id),
            sessions: this.sessions.size,
          });
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.options.logger.error('MCP request failed', error as Error);
      if (!res.headersSent) {
        res.status(500).json(jsonRpcError(-32603, 'Internal error'));
      }
    }
  }

  private async handleSessionRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const session = sessionId ? this.sessions.get(sessionId) : undefined;

    if (!session || !this.ownsSession(session, authOf(req))) {
      if (session) {
        this.options.logger.warn('Rejected cross-grant session access', {
          session: sessionTag(sessionId as string),
          clientId: authOf(req)?.clientId,
        });
      }
      res.status(404).type('text/plain').send('Unknown session');
      return;
    }

    try {
      session.lastSeenAt = Date.now();
      await session.transport.handleRequest(req, res);
    } catch (error) {
      this.options.logger.error('MCP session request failed', error as Error);
      if (!res.headersSent) res.status(500).end();
    }
  }

  async start(): Promise<void> {
    if (this.state === 'running') return;
    if (this.state === 'starting' && this.startPromise) return this.startPromise;
    if (this.state === 'stopping' || this.state === 'stopped') {
      throw new Error('HttpTransportHost has been stopped and cannot be restarted');
    }

    const { host, port, logger, publicUrl } = this.options;
    this.state = 'starting';

    // `app.listen()` returns the server synchronously, so a concurrent stop()
    // used to close it before 'listening' ever fired, leaving this promise
    // pending for ever. Settling on 'close' as well is what makes stop()
    // during start() terminate.
    this.startPromise = new Promise<void>((resolve, reject) => {
      const server = this.app.listen(port, host, (): void => {
        if (this.state === 'starting') this.state = 'running';
        resolve();
      });
      this.httpServer = server;
      server.on('error', (error: Error) => {
        if (this.state === 'starting') {
          reject(error);
        } else {
          // After startup a `reject` here is a no-op, so the error would
          // otherwise vanish entirely.
          logger.error('HTTP server error', error);
        }
      });
      server.once('close', () => {
        if (this.state === 'starting') {
          reject(new Error('HTTP transport was stopped before it finished starting'));
        }
      });
    });

    await this.startPromise;

    this.sessionSweeper = setInterval(() => this.sweepSessions(), SESSION_SWEEP_MS);
    this.sessionSweeper.unref?.();

    logger.info('MCP HTTP transport listening', {
      bind: `${host}:${port}`,
      publicUrl: publicUrl.toString(),
    });

    if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
      logger.warn(
        `HTTP transport is bound to ${host}, not loopback. This server does not ` +
          'terminate TLS and should sit behind a reverse proxy that does.',
      );
    }
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') return;
    this.state = 'stopping';

    if (this.sessionSweeper) {
      clearInterval(this.sessionSweeper);
      this.sessionSweeper = undefined;
    }

    // Let go of the chain first. `httpServer.close()` waits for in-flight
    // requests, and a submission parked on a 30 second interval is in-flight,
    // so without this a graceful shutdown stalled for minutes and ended in a
    // SIGKILL.
    //
    // Waiters are abandoned rather than released: releasing them would send
    // them on to be checked during shutdown, which is not what anyone wants
    // from a stop(). They answer 503 without their password being read.
    this.consentHolder?.release();
    for (const waiter of [...this.consentWaiters]) waiter.abandon('shutdown');
    this.consentWaiters.clear();

    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    await Promise.all(sessions.map((session) => this.closeSession(session)));

    if (this.httpServer) {
      const server = this.httpServer;
      await new Promise<void>((resolve) => {
        const deadline = setTimeout(() => {
          // Keep-alive sockets with nothing in flight should already be gone,
          // but a hard deadline means shutdown cannot hang on one that is not.
          server.closeAllConnections?.();
          resolve();
        }, SHUTDOWN_GRACE_MS);
        deadline.unref?.();
        server.close(() => {
          clearTimeout(deadline);
          resolve();
        });
      });
    }

    this.state = 'stopped';
  }

  /** Exposed for tests. */
  get expressApp(): Express {
    return this.app;
  }

  /** Exposed for tests: number of live MCP sessions. */
  get sessionCount(): number {
    return this.sessions.size;
  }
}

/** Map a thrown error to a status without echoing anything from it. */
function statusOf(err: unknown): number {
  const status = (err as { status?: number; statusCode?: number } | null)?.status
    ?? (err as { statusCode?: number } | null)?.statusCode;
  return typeof status === 'number' && status >= 400 && status <= 599 ? status : 400;
}

interface JsonRpcErrorBody {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id: null;
}

function jsonRpcError(code: number, message: string): JsonRpcErrorBody {
  return { jsonrpc: '2.0' as const, error: { code, message }, id: null };
}
