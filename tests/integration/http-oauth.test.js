/**
 * End-to-end test for the Streamable HTTP transport and its OAuth 2.1 server.
 *
 * Run with: node tests/integration/http-oauth.test.js
 *
 * This drives the complete authorization code + PKCE flow against a real
 * listening server — discovery, dynamic client registration, consent, code
 * exchange, an authenticated MCP initialize, refresh and revocation — and then
 * asserts the negative cases.
 *
 * The negative cases are the point. An auth layer that accepts valid
 * credentials proves very little; what matters is that it rejects a missing
 * token, a forged token, a replayed authorization code, a mismatched PKCE
 * verifier and a wrong password. Each of those is asserted below.
 *
 * No mailcow API key is configured, so the server starts in limited mode and
 * registers only its system tools. That is deliberate: this test is about the
 * transport and the auth gate, not about mailcow.
 */

const { spawn } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const path = require('node:path');

const PORT = 39771;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'correct-horse-battery-staple';

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

const CALLBACK = 'http://127.0.0.1:1/callback';

/**
 * Streamable HTTP answers either as JSON or as an SSE stream, depending on the
 * request. Pull the JSON-RPC payload out of whichever one arrived.
 */
function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  const lines = trimmed.split('\n').filter((l) => l.startsWith('data:'));
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i].slice(5).trim());
    } catch {
      /* keep looking */
    }
  }
  return null;
}

async function mcpPost(token, sessionId, payload) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text, json: extractJson(text), res };
}

/** Open an MCP session and return its id. */
async function mcpInitialize(token, clientName) {
  const out = await mcpPost(token, undefined, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: clientName, version: '0' },
    },
  });
  const sessionId = out.res.headers.get('mcp-session-id');
  if (sessionId) {
    // Completes the handshake, as a real client does.
    await mcpPost(token, sessionId, { jsonrpc: '2.0', method: 'notifications/initialized' });
  }
  return { ...out, sessionId };
}

/**
 * Run the whole authorization flow and return the token set.
 *
 * Each call is a separate grant, which is what the session-ownership and scope
 * cases need: two tokens that are both valid and must not be interchangeable.
 */
async function newGrant(clientId, scope) {
  const { verifier, challenge } = pkce();
  let url =
    `${BASE}/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK)}` +
    `&code_challenge=${challenge}&code_challenge_method=S256&state=s`;
  if (scope) url += `&scope=${encodeURIComponent(scope)}`;

  const html = await (await fetch(url)).text();
  const pending = /name="pending" value="([^"]+)"/.exec(html)?.[1];
  if (!pending) throw new Error('no pending blob on the consent page');

  const consented = await fetch(`${BASE}/authorize/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pending, password: PASSWORD }),
    redirect: 'manual',
  });
  const location = consented.headers.get('location');
  if (!location) throw new Error(`consent did not redirect (status ${consented.status})`);
  const code = new URL(location).searchParams.get('code');

  const tokenRes = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: CALLBACK,
      code_verifier: verifier,
    }),
  });
  return tokenRes.json();
}

/** Render a consent page and return only its pending blob. */
async function newGrantBlob(clientId) {
  const { challenge } = pkce();
  const url =
    `${BASE}/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK)}` +
    `&code_challenge=${challenge}&code_challenge_method=S256&state=s`;
  const html = await (await fetch(url)).text();
  const pending = /name="pending" value="([^"]+)"/.exec(html)?.[1];
  if (!pending) throw new Error('no pending blob on the consent page');
  return pending;
}

/** Text that would mean an internal error leaked into a response body. */
function looksLikeAStackTrace(text) {
  return (
    /\bat\s+[\w$.<>]+\s+\(/.test(text) ||
    text.includes('node_modules') ||
    text.includes('SyntaxError') ||
    text.includes('node:internal')
  );
}

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  const entry = path.join(__dirname, '..', '..', 'dist', 'src', 'index.js');

  const server = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      MCP_TRANSPORT: 'http',
      MCP_HTTP_HOST: '127.0.0.1',
      MCP_HTTP_PORT: String(PORT),
      MCP_PUBLIC_URL: BASE,
      MCP_OAUTH_PASSWORD: PASSWORD,
      // A syntactically valid dummy key (the validator requires >= 32 chars).
      // It points at nothing reachable, which is fine: this test exercises the
      // transport and the auth gate, never the mailcow API itself.
      MAILCOW_API_KEY: 'TESTKEY-0000000000000000000000000000',
      MAILCOW_API_URL: 'http://127.0.0.1:9',
      LOG_LEVEL: 'warn',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d));
  server.stderr.on('data', (d) => (serverOutput += d));

  try {
    if (!(await waitForServer())) {
      console.error('Server failed to start. Output:\n' + serverOutput);
      process.exit(1);
    }

    // --- discovery -----------------------------------------------------
    const asMeta = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
    check('authorization server metadata is served', !!asMeta.authorization_endpoint);
    check(
      'metadata advertises PKCE S256',
      Array.isArray(asMeta.code_challenge_methods_supported) &&
        asMeta.code_challenge_methods_supported.includes('S256'),
      JSON.stringify(asMeta.code_challenge_methods_supported),
    );

    const prRes = await fetch(`${BASE}/.well-known/oauth-protected-resource`);
    check('protected resource metadata is served', prRes.ok, `status ${prRes.status}`);

    // --- the gate, before we hold any token -----------------------------
    const noAuth = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    check('unauthenticated /mcp is rejected', noAuth.status === 401, `status ${noAuth.status}`);
    check(
      'rejection carries WWW-Authenticate pointing at resource metadata',
      (noAuth.headers.get('www-authenticate') || '').includes('resource_metadata'),
      noAuth.headers.get('www-authenticate') || '(absent)',
    );

    const forged = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    check('forged bearer token is rejected', forged.status === 401, `status ${forged.status}`);

    // --- dynamic client registration ------------------------------------
    const reg = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'integration-test',
        redirect_uris: ['http://127.0.0.1:1/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });
    const client = await reg.json();
    check('dynamic client registration succeeds', reg.ok && !!client.client_id, `status ${reg.status} ${JSON.stringify(client).slice(0, 200)}`);

    // --- consent --------------------------------------------------------
    const { verifier, challenge } = pkce();
    const authUrl =
      `${BASE}/authorize?response_type=code&client_id=${encodeURIComponent(client.client_id)}` +
      `&redirect_uri=${encodeURIComponent('http://127.0.0.1:1/callback')}` +
      `&code_challenge=${challenge}&code_challenge_method=S256&state=xyz`;

    const consent = await fetch(authUrl);
    const consentHtml = await consent.text();
    check('consent page is served', consent.ok && consentHtml.includes('name="pending"'), `status ${consent.status}`);

    const pending = /name="pending" value="([^"]+)"/.exec(consentHtml)?.[1];
    check('consent page carries a pending blob', !!pending);

    // Wrong password must not produce a code.
    const badPw = await fetch(`${BASE}/authorize/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ pending, password: 'wrong-password' }),
      redirect: 'manual',
    });
    check('wrong operator password is rejected', badPw.status === 401, `status ${badPw.status}`);

    const goodPw = await fetch(`${BASE}/authorize/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ pending, password: PASSWORD }),
      redirect: 'manual',
    });
    check('correct password redirects with a code', goodPw.status === 302, `status ${goodPw.status}`);
    const location = new URL(goodPw.headers.get('location'));
    const code = location.searchParams.get('code');
    check('authorization code is present', !!code);
    check('state is echoed back', location.searchParams.get('state') === 'xyz');

    // --- PKCE is actually enforced ---------------------------------------
    const wrongVerifier = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
        code_verifier: b64url(randomBytes(32)),
      }),
    });
    check('token exchange with a wrong PKCE verifier fails', !wrongVerifier.ok, `status ${wrongVerifier.status}`);

    // --- real exchange ----------------------------------------------------
    const tokenRes = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
        code_verifier: verifier,
      }),
    });
    const tokens = await tokenRes.json();
    check('authorization code exchanges for a token', tokenRes.ok && !!tokens.access_token, `status ${tokenRes.status} ${JSON.stringify(tokens).slice(0, 200)}`);
    check('a refresh token is issued', !!tokens.refresh_token);

    // --- replay -----------------------------------------------------------
    const replay = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:1/callback',
        code_verifier: verifier,
      }),
    });
    check('authorization code cannot be replayed', !replay.ok, `status ${replay.status}`);

    // --- authenticated MCP -------------------------------------------------
    const init = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'integration-test', version: '0' },
        },
      }),
    });
    const initBody = await init.text();
    check('authenticated initialize succeeds', init.ok, `status ${init.status} ${initBody.slice(0, 200)}`);
    check('a session id is issued', !!init.headers.get('mcp-session-id'));

    // --- refresh ------------------------------------------------------------
    const refreshed = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: client.client_id,
      }),
    });
    const refreshedTokens = await refreshed.json();
    check('refresh token yields a new access token', refreshed.ok && !!refreshedTokens.access_token, `status ${refreshed.status}`);
    check(
      'refresh token is rotated',
      refreshedTokens.refresh_token && refreshedTokens.refresh_token !== tokens.refresh_token,
    );

    const staleRefresh = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: client.client_id,
      }),
    });
    check('the consumed refresh token no longer works', !staleRefresh.ok, `status ${staleRefresh.status}`);

    // --- the authorization path cannot be locked out ------------------------
    //
    // The SDK applies express-rate-limit to /authorize (100 per 15 minutes),
    // /register (20 per hour), /token and /revoke, keyed on req.ip and
    // answering 429. Behind a reverse proxy with trust proxy off, which is the
    // default and the documented deployment, req.ip is the proxy's address for
    // every request on earth, so each limiter is one global bucket that any
    // single caller drains. 100 unauthenticated GETs and the operator can
    // never render a consent page again; 20 registrations and no client can be
    // added at all.
    //
    // An earlier version of this branch claimed to have fixed that by moving
    // the consent POST ahead of the SDK router. It had not: the POST is
    // useless without a blob, and the blob comes from GET /authorize, which
    // was still behind the limiter.
    const floodStatuses = new Set();
    for (let i = 0; i < 130; i++) {
      const probe = await fetch(
        `${BASE}/authorize?response_type=code&client_id=${encodeURIComponent(client.client_id)}` +
          `&redirect_uri=${encodeURIComponent(CALLBACK)}` +
          `&code_challenge=${pkce().challenge}&code_challenge_method=S256&state=s`,
      );
      floodStatuses.add(probe.status);
      await probe.arrayBuffer();
    }
    check(
      '130 unauthenticated authorize requests are never answered with 429',
      !floodStatuses.has(429),
      [...floodStatuses].join(','),
    );

    const afterFlood = await newGrantBlob(client.client_id);
    check('the operator can still obtain a consent page afterwards', !!afterFlood);

    const regStatuses = new Set();
    for (let i = 0; i < 30; i++) {
      const reg2 = await fetch(`${BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: `flood-${i}`,
          redirect_uris: [CALLBACK],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      });
      regStatuses.add(reg2.status);
      await reg2.arrayBuffer();
    }
    check(
      '30 registrations are never answered with 429',
      !regStatuses.has(429),
      [...regStatuses].join(','),
    );

    // --- abandoned submissions do not lock the operator out -----------------
    //
    // The slot a submission reserves used to be held for its full interval
    // whether or not anyone was still connected, and over-budget submissions
    // were refused with a 503 decided before the password was read. Together
    // that meant twelve POSTs the attacker aborted after 30ms, costing them no
    // open sockets at all, answered the operator's correct password with a 503
    // in two milliseconds.
    const abandoned = [];
    for (let i = 0; i < 12; i++) {
      const blob = await newGrantBlob(client.client_id);
      const controller = new AbortController();
      abandoned.push(
        fetch(`${BASE}/authorize/consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ pending: blob, password: `abandon-${i}` }),
          redirect: 'manual',
          signal: controller.signal,
        }).catch(() => null),
      );
      setTimeout(() => controller.abort(), 30);
    }
    await Promise.allSettled(abandoned);
    await new Promise((r) => setTimeout(r, 300));

    const rescueBlob = await newGrantBlob(client.client_id);
    const rescueStarted = Date.now();
    const rescue = await fetch(`${BASE}/authorize/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ pending: rescueBlob, password: PASSWORD }),
      redirect: 'manual',
    });
    const rescueElapsed = Date.now() - rescueStarted;
    check(
      'the correct password is accepted after a run of abandoned submissions',
      rescue.status === 302,
      `status ${rescue.status} after ${rescueElapsed}ms`,
    );
    check(
      'and it is not refused or shed',
      rescue.status !== 503 && rescue.status !== 429,
      `status ${rescue.status}`,
    );

    // --- error responses still carry the security headers -------------------
    //
    // The header middleware was registered after the body parsers, so a parser
    // error short-circuited to the error handler and the response carried none
    // of them: no nosniff, no frame denial, no no-store. That is exactly the
    // class of response the error handler exists to produce.
    const parserError = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"jsonrpc": "2.0", broken',
    });
    await parserError.arrayBuffer();
    check(
      'a body-parser error response carries X-Content-Type-Options',
      parserError.headers.get('x-content-type-options') === 'nosniff',
      parserError.headers.get('x-content-type-options') || '(absent)',
    );
    check(
      'a body-parser error response is not cacheable',
      (parserError.headers.get('cache-control') || '').includes('no-store'),
      parserError.headers.get('cache-control') || '(absent)',
    );

    const healthz = await fetch(`${BASE}/healthz`);
    await healthz.arrayBuffer();
    const csp = healthz.headers.get('content-security-policy') || '';
    check('a content security policy is set', csp.includes("default-src 'none'"), csp || '(absent)');
    // form-action must NOT be set. Browsers enforce it against the whole
    // redirect chain, so form-action 'self' blocks the 302 that carries the
    // authorization code to the client. The server mints a valid code and the
    // browser never arrives, which presents exactly like a wrong password.
    // It cost six failed authorizations and four wrong diagnoses to find.
    check(
      'the policy does not set form-action, which would block the auth redirect',
      !csp.includes('form-action'),
      csp,
    );

    // --- method handling on /mcp -------------------------------------------
    const putMcp = await fetch(`${BASE}/mcp`, { method: 'PUT' });
    await putMcp.arrayBuffer();
    check(
      'an unsupported method on /mcp is a 405 with Allow',
      putMcp.status === 405 && (putMcp.headers.get('allow') || '').includes('POST'),
      `status ${putMcp.status} allow ${putMcp.headers.get('allow') || '(absent)'}`,
    );

    // --- the advertised resource metadata URL resolves ----------------------
    const unauth = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    await unauth.arrayBuffer();
    const advertised = /resource_metadata="([^"]+)"/.exec(
      unauth.headers.get('www-authenticate') || '',
    )?.[1];
    check('the challenge advertises a resource metadata URL', !!advertised);
    if (advertised) {
      const metaRes = await fetch(advertised);
      await metaRes.arrayBuffer();
      // Built from the origin alone, this 404s for any deployment whose public
      // URL carries a path prefix, which is a documented configuration.
      check(
        'the advertised resource metadata URL resolves',
        metaRes.ok,
        `${advertised} -> ${metaRes.status}`,
      );
    }

    // --- two clients at once ------------------------------------------------
    //
    // Why this test exists: a single `Server` instance can be connected to
    // exactly one transport, and the second `connect()` throws
    // `Already connected to a transport`. With one shared instance the server
    // served whichever client arrived first and failed every other, so Claude
    // and ChatGPT could not both be connected. Each session now gets its own
    // protocol object.
    const grantA = await newGrant(client.client_id);
    const grantB = await newGrant(client.client_id);

    const sessionA = await mcpInitialize(grantA.access_token, 'client-a');
    const sessionB = await mcpInitialize(grantB.access_token, 'client-b');

    check('a first client can initialize', sessionA.ok && !!sessionA.sessionId, `status ${sessionA.status} ${sessionA.text.slice(0, 200)}`);
    check('a second client can initialize at the same time', sessionB.ok && !!sessionB.sessionId, `status ${sessionB.status} ${sessionB.text.slice(0, 200)}`);
    check('the two sessions are distinct', !!sessionA.sessionId && sessionA.sessionId !== sessionB.sessionId);

    // Both sessions must be usable, not merely openable.
    const listA = await mcpPost(grantA.access_token, sessionA.sessionId, {
      jsonrpc: '2.0', id: 2, method: 'tools/list',
    });
    const listB = await mcpPost(grantB.access_token, sessionB.sessionId, {
      jsonrpc: '2.0', id: 2, method: 'tools/list',
    });
    check('the first session serves requests', listA.ok && !!listA.json?.result?.tools, `status ${listA.status} ${listA.text.slice(0, 200)}`);
    check('the second session serves requests concurrently', listB.ok && !!listB.json?.result?.tools, `status ${listB.status} ${listB.text.slice(0, 200)}`);

    // --- session ownership ---------------------------------------------------
    //
    // A session id travels in a plain header and is a capability on its own.
    // Without a binding check any valid token could drive any live session and
    // read its results.
    const crossSession = await mcpPost(grantB.access_token, sessionA.sessionId, {
      jsonrpc: '2.0', id: 3, method: 'tools/list',
    });
    check(
      'a token from another grant cannot drive this session',
      crossSession.status === 404,
      `status ${crossSession.status} ${crossSession.text.slice(0, 200)}`,
    );

    const crossGet = await fetch(`${BASE}/mcp`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${grantB.access_token}`,
        'mcp-session-id': sessionA.sessionId,
      },
    });
    check('the same binding applies to the event stream', crossGet.status === 404, `status ${crossGet.status}`);

    // The rightful owner is unaffected by those attempts.
    const stillMine = await mcpPost(grantA.access_token, sessionA.sessionId, {
      jsonrpc: '2.0', id: 4, method: 'tools/list',
    });
    check('the owning token still works afterwards', stillMine.ok, `status ${stillMine.status}`);

    // --- scope is enforced, not just advertised ------------------------------
    //
    // The metadata document advertises mailcow:read and mailcow:write, and the
    // operator approves one of them on the consent screen. Before this nothing
    // checked either at the point of use.
    const readOnly = await newGrant(client.client_id, 'mailcow:read');
    check('a read-only grant is issued with only that scope', readOnly.scope === 'mailcow:read', String(readOnly.scope));

    const readSession = await mcpInitialize(readOnly.access_token, 'read-only-client');
    check('a read-only client can still connect', readSession.ok && !!readSession.sessionId, `status ${readSession.status}`);

    const writeAttempt = await mcpPost(readOnly.access_token, readSession.sessionId, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'create_domain', arguments: { domain: 'scope-test.example' } },
    });
    const writeText = JSON.stringify(writeAttempt.json ?? writeAttempt.text);
    check(
      'a read-only token cannot call a write tool',
      writeText.includes('insufficient_scope'),
      writeText.slice(0, 300),
    );

    const readAttempt = await mcpPost(readOnly.access_token, readSession.sessionId, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'list_domains', arguments: {} },
    });
    const readText = JSON.stringify(readAttempt.json ?? readAttempt.text);
    // It will fail against the unreachable dummy API, and that is fine. What
    // matters is that it was not turned away for scope.
    check(
      'a read-only token is not blocked from a read tool',
      !readText.includes('insufficient_scope'),
      readText.slice(0, 300),
    );

    const widen = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: readOnly.refresh_token,
        client_id: client.client_id,
        scope: 'mailcow:read mailcow:write',
      }),
    });
    check('a refresh cannot widen its own scope', !widen.ok, `status ${widen.status}`);

    // --- revocation covers the grant ----------------------------------------
    //
    // With the pair unlinked, revoking the access token left the refresh token
    // live, the client minted a replacement, and the revocation was cosmetic.
    const doomed = await newGrant(client.client_id);
    const revoke = await fetch(`${BASE}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: doomed.access_token, client_id: client.client_id }),
    });
    check('revocation is accepted', revoke.ok, `status ${revoke.status}`);

    const revokedMcp = await mcpPost(doomed.access_token, undefined, {
      jsonrpc: '2.0', id: 7, method: 'tools/list',
    });
    check('the revoked access token is rejected', revokedMcp.status === 401, `status ${revokedMcp.status}`);

    const revokedRefresh = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: doomed.refresh_token,
        client_id: client.client_id,
      }),
    });
    check(
      'revoking the access token also kills its refresh token',
      !revokedRefresh.ok,
      `status ${revokedRefresh.status}`,
    );

    // --- errors do not leak internals ---------------------------------------
    //
    // Express's default handler prints the stack when NODE_ENV is unset. The
    // container sets it, which made the leak depend on how the process was
    // launched rather than on the code.
    const badJson = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"jsonrpc": "2.0", this is not json',
    });
    const badJsonText = await badJson.text();
    check('a malformed body is rejected', badJson.status >= 400 && badJson.status < 500, `status ${badJson.status}`);
    check('a malformed body leaks no stack trace', !looksLikeAStackTrace(badJsonText), badJsonText.slice(0, 300));

    const tooBig = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad: 'x'.repeat(2000000) } }),
    });
    const tooBigText = await tooBig.text();
    check('an oversized body is rejected', tooBig.status >= 400 && tooBig.status < 500, `status ${tooBig.status}`);
    check('an oversized body leaks no stack trace', !looksLikeAStackTrace(tooBigText), tooBigText.slice(0, 300));

    // --- consent throttling --------------------------------------------------
    //
    // This section exists because the throttle here was wrong three times, and
    // each assertion below pins one of those.
    //
    // It was keyed on a hash of the consent page, so one caller could not slow
    // another. An attacker resets that for free: /authorize needs no
    // authentication and registration is open, so a fresh page before each
    // guess makes every guess the first failure for its own key.
    //
    // The saturation guard then ran before the password was checked, so a
    // flood of failures had the operator's own correct submission answered
    // with a 503.
    //
    // And the delay was applied to the *reply* rather than to the *check*,
    // which bounded latency and not guessing: saturate the route and every
    // guess was still evaluated at full speed, a wrong one dropped at once and
    // a right one redirected at once. That is a negative oracle, and it is why
    // a correct password now waits its turn like everything else.
    let sawTooManyRequests = false;

    async function consentAttempt(password) {
      // A fresh consent page every time, which is exactly what an attacker does.
      const blob = await newGrantBlob(client.client_id);
      const started = Date.now();
      const attempt = await fetch(`${BASE}/authorize/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ pending: blob, password }),
        redirect: 'manual',
      });
      if (attempt.status === 429) sawTooManyRequests = true;
      return { status: attempt.status, elapsed: Date.now() - started };
    }

    const firstFailure = await consentAttempt('wrong-one');
    check('a wrong password is rejected', firstFailure.status === 401, `status ${firstFailure.status}`);

    // Overflow past the queue bound must be refused WITHOUT a verdict.
    //
    // The version this replaces checked a submission immediately once the
    // queue had grown past a time ceiling, which reads like graceful
    // degradation and was a total bypass: a skipping submission never advances
    // the cursor, so after one flood pushed it past the ceiling, every later
    // guess was checked at once with no spacing at all. The bound it was meant
    // to soften stopped existing.
    //
    // What should happen instead: the submissions that fit the queue wait
    // their turn, and the rest get a 503 decided on depth alone, before the
    // password is read. So within a few hundred milliseconds the only
    // responses seen should be refusals, never a 401 or a 302, because
    // answering either of those quickly is the verdict leaking.
    const overflowControllers = [];
    const overflowStatuses = [];
    for (let i = 0; i < 14; i++) {
      const blob = await newGrantBlob(client.client_id);
      const controller = new AbortController();
      overflowControllers.push(controller);
      void fetch(`${BASE}/authorize/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ pending: blob, password: `overflow-${i}` }),
        redirect: 'manual',
        signal: controller.signal,
      })
        .then((r) => overflowStatuses.push(r.status))
        .catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 700));

    const fastVerdicts = overflowStatuses.filter((s) => s === 401 || s === 302);
    check(
      'overflow submissions are refused rather than checked',
      overflowStatuses.includes(503),
      `statuses seen within 700ms: ${overflowStatuses.join(',') || '(none)'}`,
    );
    check(
      'no submission is given a verdict ahead of its slot',
      fastVerdicts.length === 0,
      `${fastVerdicts.length} verdict(s) returned early: ${fastVerdicts.join(',')}`,
    );

    // Release the queued ones so the rest of the suite is not waiting behind
    // them; the slots are handed back on disconnect.
    for (const controller of overflowControllers) controller.abort();
    await new Promise((r) => setTimeout(r, 400));

    // Repeated cycles of abandoned submissions must not grow the wait.
    //
    // Each admitted submission advances the check cursor, and the rollback on
    // disconnect only covers the most recent reservation. So an attacker who
    // keeps the queue cycling and abandons the oldest entries used to push the
    // cursor forward without limit. That never refuses the operator, which the
    // rest of this design is careful about, and makes them wait an unbounded
    // time instead, which is the same outcome by a slower route. The cursor is
    // clamped now.
    for (let round = 0; round < 3; round++) {
      const cycle = [];
      for (let i = 0; i < 8; i++) {
        const blob = await newGrantBlob(client.client_id);
        const controller = new AbortController();
        cycle.push(
          fetch(`${BASE}/authorize/consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ pending: blob, password: `cycle-${round}-${i}` }),
            redirect: 'manual',
            signal: controller.signal,
          }).catch(() => null),
        );
        setTimeout(() => controller.abort(), 40);
      }
      await Promise.allSettled(cycle);
    }

    const boundedBlob = await newGrantBlob(client.client_id);
    const boundedStarted = Date.now();
    const bounded = await fetch(`${BASE}/authorize/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ pending: boundedBlob, password: 'still-wrong' }),
      redirect: 'manual',
    });
    const boundedElapsed = Date.now() - boundedStarted;
    check(
      'a submission is still answered after repeated abandoned cycles',
      bounded.status === 401 || bounded.status === 503,
      `status ${bounded.status}`,
    );
    check(
      'and the wait is bounded rather than inflated by them',
      boundedElapsed < 25000,
      `waited ${boundedElapsed}ms, which means the cursor was pushed forward without limit`,
    );

    // The guarantee is a bound on how often a guess is *checked*, server-wide,
    // whatever concurrency the attacker brings. Four guesses fired at once,
    // each with its own freshly rendered consent page, must therefore take
    // several seconds in total rather than finishing together: they are
    // serialized behind the check slot, and a fresh page does not buy a caller
    // a slot of its own.
    const burstStarted = Date.now();
    const burst = await Promise.all([
      consentAttempt('burst-one'),
      consentAttempt('burst-two'),
      consentAttempt('burst-three'),
      consentAttempt('burst-four'),
    ]);
    const burstElapsed = Date.now() - burstStarted;

    check(
      'concurrent guesses are all rejected',
      burst.every((attempt) => attempt.status === 401),
      burst.map((a) => a.status).join(','),
    );
    check(
      'concurrent guesses are checked one at a time, not all at once',
      burstElapsed > 2500,
      `four concurrent guesses resolved in ${burstElapsed}ms, which would mean the check rate is unbounded`,
    );

    // The one that catches the oracle: after failures have accumulated, a
    // correct password must wait for its slot too. If it comes back promptly
    // while wrong answers are being throttled, the response time is the
    // verdict and the throttle is decorative.
    const throttledSuccess = await consentAttempt(PASSWORD);
    check(
      'a correct password is accepted',
      throttledSuccess.status === 302,
      `status ${throttledSuccess.status}`,
    );
    check(
      'a correct password does not skip the check queue',
      throttledSuccess.elapsed > 1500,
      `${throttledSuccess.elapsed}ms, which would make response time the verdict`,
    );
    check('no submission is ever answered with 429', !sawTooManyRequests);

    // That success cleared the counter, so the flows below are not throttled.
    // Only a correct password clears it; guessing cannot.
    const afterSuccess = await consentAttempt(PASSWORD);
    check(
      'a correct password is prompt once the counter is cleared',
      afterSuccess.status === 302 && afterSuccess.elapsed < 1000,
      `status ${afterSuccess.status} in ${afterSuccess.elapsed}ms`,
    );

    // A success must not hand out free guesses to whatever is queued behind it.
    //
    // Clearing the throttle on success has to skip the remaining interval of
    // the one link holding the chain, and nothing else. An earlier version
    // released every pending link, including submissions whose turn had not
    // come: their holds resolved early, so the whole queue behind the
    // operator's success was then checked back to back with no spacing. The
    // operator's own correct password was what handed out the burst.
    const correctFirst = newGrantBlob(client.client_id).then((blob) =>
      fetch(`${BASE}/authorize/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ pending: blob, password: PASSWORD }),
        redirect: 'manual',
      }).catch(() => null),
    );
    await new Promise((r) => setTimeout(r, 120));

    const behind = [];
    for (let i = 0; i < 5; i++) {
      const blob = await newGrantBlob(client.client_id);
      behind.push(
        fetch(`${BASE}/authorize/consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ pending: blob, password: `behind-${i}` }),
          redirect: 'manual',
        }).catch(() => null),
      );
    }

    const behindStarted = Date.now();
    await correctFirst;
    const behindResults = await Promise.all(behind);
    const behindElapsed = Date.now() - behindStarted;

    check(
      'guesses queued behind a success are still rejected',
      behindResults.every((r) => r === null || r.status === 401 || r.status === 503),
      behindResults.map((r) => (r ? r.status : 'err')).join(','),
    );
    check(
      'and they keep their spacing rather than being released by it',
      behindElapsed > 2500,
      `five queued guesses resolved in ${behindElapsed}ms, which would mean the success released their holds`,
    );

    // --- unknown routes -------------------------------------------------------
    const notFound = await fetch(`${BASE}/../etc/passwd`);
    check('unknown routes 404 rather than leaking', notFound.status === 404 || notFound.status === 400, `status ${notFound.status}`);
  } finally {
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!server.killed) server.kill('SIGKILL');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nServer output:\n' + serverOutput.slice(-3000));
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
