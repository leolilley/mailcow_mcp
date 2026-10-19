# Remote deployment

How to run this server over HTTP so Claude (web) and ChatGPT can use it as a
custom connector, and what that exposure actually costs.

Running over stdio needs none of this. Read it only if the server has to be
reachable over a network.

---

## Why HTTP needs OAuth

Remote MCP clients will not send a static bearer header. Both Claude and
ChatGPT connect from their vendor's cloud to a public HTTPS endpoint and
authenticate with OAuth 2.1 — authorization code, PKCE, token refresh. There is
no API-key mode to fall back to.

So `MCP_TRANSPORT=http` starts an OAuth 2.1 authorization server alongside the
MCP endpoint. It is built from the MCP SDK's own auth components rather than
hand-rolled.

| Endpoint | |
|---|---|
| `POST /mcp` | the MCP endpoint, bearer token required |
| `GET /authorize` | consent screen |
| `POST /authorize/consent` | consent submission (not `/authorize` — the SDK owns both methods there) |
| `POST /token` | code exchange and refresh |
| `POST /register` | dynamic client registration |
| `POST /revoke` | token revocation |
| `GET /.well-known/oauth-authorization-server` | discovery |
| `GET /.well-known/oauth-protected-resource` | resource metadata |
| `GET /healthz` | liveness, unauthenticated |

### What the OAuth layer is, and is not

It authenticates **the operator** to **this server**. One password, set in
`MCP_OAUTH_PASSWORD`.

It is **not** an identity provider. There are no users, no roles, and no
per-person audit trail. If you need several people with different permissions,
put a real IdP in front and swap in the SDK's `ProxyOAuthServerProvider`. The
transport does not care which provider it is handed.

Tokens live in memory. A restart invalidates them and the client re-authorizes,
which is one click. That is a deliberate trade: no bearer tokens on disk.

### Grants, scope and lifetime

Each authorization creates a **grant**, and the access token and refresh token
both belong to it. Three consequences worth knowing before you deploy:

- **Revoking either token revokes the whole grant.** Revoking only the access
  token would leave the refresh token able to mint a replacement, so
  revocation has to reach the grant to mean anything (RFC 7009 section 2.1).
- **A grant expires 30 days after the operator approved it.** Refresh rotation
  issues new tokens but never moves that deadline, so a leaked refresh token
  ages out instead of lasting until the process restarts. After 30 days the
  client sends you through the consent screen again.
- **An MCP session is bound to its grant.** A session id travels in a plain
  header and is a capability on its own, so a token from a different
  authorization cannot attach to a session it did not open. The mismatch
  answers 404 rather than 403, so a caller does not learn the session exists.

Two scopes are defined, `mailcow:read` and `mailcow:write`, and they are
enforced per tool rather than at the MCP endpoint: a client holding only
`mailcow:read` connects normally and is refused the write tools. A refresh may
narrow its scope and never widen it. A client that requests no scope is granted
both, which is what Claude's registration does.

Scope is a second, independent gate from the exposure flags below. The flags
decide which tools exist for a deployment at all; scope decides which of those
a given token may call. A read-only mailcow API key is a third, and the only
one that holds no matter what this server is persuaded to do.

Over stdio there is no token, so none of this applies: the caller is the user
who launched the process.

---

## Tool exposure: what ships enabled, and what does not

Three groups of tools are **implemented but not registered by default**. They
are not merely refused at call time: they are never registered, so they do not
appear in `tools/list`. A model cannot see them, cannot be argued into calling
them, and cannot tell a user it was blocked.

All three flags are specific to this transport. Over stdio every tool is
registered, because the caller is whoever launched the process.

### Destructive — `MCP_ENABLE_DESTRUCTIVE_TOOLS`

`delete_domain` · `delete_mailbox` · `delete_user` · `delete_dkim_key` ·
`update_dkim_key` · `delete_queue_items` · `delete_sync_job` ·
`update_domain` · `create_dkim_key`

**These are off by default because a publicly exposed MCP server has a very
large blast radius.** Deleting a domain destroys every mailbox under it.
Deleting queue items discards undelivered mail that no one gets and no one can
recover. None of these is reversible from inside this server, and none is
something you need an LLM to do at two in the morning — you would do it in the
mailcow UI, where you can see what you are about to destroy.

`update_dkim_key` is in that list and deserves singling out, because it does
not look destructive. Rotating a DKIM key deletes nothing and the panel reports
success. But signing breaks the moment the key changes and stays broken until
DNS propagates: mail keeps flowing while receivers start failing DMARC, and
nothing alerts you. It is the most dangerous tool here precisely because it is
quiet.

### Credential-setting — `MCP_ENABLE_CREDENTIAL_TOOLS`

`update_mailbox` · `update_user` · `create_mailbox` · `create_user` ·
`create_sync_job` · `update_sync_job`

These destroy nothing, and that is precisely the problem: a deny-list built by
thinking about which tools *delete* things misses every one of them.

`update_mailbox` accepts a `password` field. A model that has read an injected
instruction resets `postmaster@yourdomain`, and whoever reads the new password
logs in over IMAP — reading all mail, sending authenticated mail from a trusted
domain, deleting whatever they like. Every outcome the destructive group exists
to prevent, reached without a single delete tool.

`create_mailbox` is the same shape one step removed: it mints a new
authenticated identity on a domain recipients already trust.
`billing@yourcompany.example` with a known password is a phishing primitive.

Separated from the destructive group so you can have mailbox administration
without also exposing deletion, which is the common case.

### Outbound — `MCP_ENABLE_OUTBOUND_TOOLS`

`send_email`

Off by default for a different reason. It destroys nothing, but it lets a model
send mail from a domain recipients trust. That is a phishing primitive, and the
cost lands on your reputation rather than your data.

### Enabling them

Set the flag to the exact string `true`. Any other value — `1`, `yes`, a stray
space, an unsubstituted shell variable — leaves the tools off. For flags that
gate mail destruction, failing closed on a typo is the only acceptable
behaviour.

The server logs a prominent warning at startup when either group is enabled on
the HTTP transport.

---

## The threat this exposure creates

An MCP server that administers mail, driven by a model that reads mail, has a
property most connectors do not: **its input is attacker-controlled by design.**
Anyone who knows an address on your server can put text in front of the model.

If the model reads a message body containing instructions and acts on them, you
have a confused deputy holding mail-admin credentials. The attacker's only
prerequisite was knowing an email address.

What actually helps, roughly in order of how much:

1. **Do not enable the destructive and outbound groups.** The best mitigation
   for a dangerous capability is not having it.
2. **Use a read-only mailcow API key.** Set `MAILCOW_API_ACCESS_TYPE=read-only`
   and issue a read-only key. This server cannot exceed what the key permits,
   whatever the model is persuaded to attempt. It is the only control here that
   holds regardless of model behaviour.
3. **Restrict the key by source address.** mailcow requires an API allowlist;
   pin it to this server rather than opening it.
4. **Let the client prompt you.** Claude and ChatGPT both ask before running
   write tools. Useful, but do not lean on it: "always allow" exists, the
   dialog shows the call rather than its consequence, and an injected
   instruction arrives with a plausible justification the model generated from
   the same poisoned content.

What does **not** help as much as it appears to: labelling content as data,
wrapping it in tags, or instructing the model to ignore instructions it reads.
There is no in-band delimiter an attacker cannot write. Treat prompt-level
framing as raising the bar, never as closing the hole.

---

## Deploying

### 1. Reverse proxy

This server does not terminate TLS, and should not. Put it behind a proxy that
does, and bind it somewhere the internet cannot reach directly.

```nginx
location /mcp {
    proxy_pass http://127.0.0.1:3000/mcp;
    proxy_http_version 1.1;

    # Streamable HTTP keeps a response open for server-sent events.
    # Without these, the connection is buffered or cut mid-stream.
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The OAuth endpoints and the two `.well-known` documents must be reachable at
the same origin as `MCP_PUBLIC_URL`, so proxy those paths too.

Set `MCP_TRUST_PROXY=true` only once the proxy is in place. Until then a direct
caller can forge `X-Forwarded-For` and poison your logs.

### 2. Two allowlists, not one

The endpoints here are reached by two different parties, and that split is the
only place a source allowlist can do real work.

| Reached by the operator's **browser** | Reached by the vendor's **backend** |
|---|---|
| `GET /authorize` (the consent screen) | `POST /token` |
| `POST /authorize/consent` | `POST /register` |
| | `POST /revoke` |
| | `POST/GET/DELETE /mcp` |
| | the two `.well-known` documents |

The consent flow is a browser redirect: Claude or ChatGPT sends *you* to
`/authorize`, you type the operator password, and the code goes back to the
vendor. So the vendor's published egress ranges are the wrong allowlist for
`/authorize` — restrict that path to the vendor and you will never be able to
authorize anything, because your own browser is not in it.

Splitting them is also what makes the throttle discussion above moot. Nothing
inside the process can tell you from an attacker; nginx can, because it sees a
source address:

```nginx
# The operator's own path. Restrict it to wherever you actually authorize from:
# a VPN range, an office prefix, a bastion. This is the control that makes the
# consent route's throttling a second line rather than the only one.
location ^~ /authorize {
    allow 203.0.113.0/24;   # your network, not the vendor's
    deny  all;

    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Everything the vendor's infrastructure calls.
location / {
    allow 160.79.104.0/21;                          # Anthropic, published and stable
    include /etc/nginx/snippets/openai-egress.conf; # see below, if you need ChatGPT
    deny  all;

    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # Streamable HTTP keeps a response open for server-sent events.
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`location ^~ /authorize` wins over the prefix `location /` for both
`/authorize` and `/authorize/consent`, which is what you want: one rule covers
the whole operator path.

If you authorize from a dynamic address, the honest options are a VPN, a
bastion you can allowlist, or opening `/authorize` only while you add the
connector and closing it again afterwards. Leaving it open to the internet is
also a choice; it is the one the in-process throttle exists for, and it is
weaker than any of the three above.

Set `MCP_TRUST_PROXY=true` once this is in place, so the server sees the real
client address rather than the proxy's.

### 3. Anthropic publishes stable egress addresses

`160.79.104.0/21`. Restricting the vhost to it is cheap defence in depth:

```nginx
allow 160.79.104.0/21;
deny  all;
```

Anthropic recommends OAuth over IP allowlisting; do both.

OpenAI's equivalent list is 283 prefixes and is regenerated — if you need
ChatGPT too, either fetch `https://openai.com/chatgpt-connectors.json` on a
schedule and regenerate the allowlist, or drop IP filtering and rely on OAuth.
OpenAI states plainly that an IP allowlist identifies their network, not a
user, and does not replace authentication.

### 4. Container

A `Dockerfile` and `docker-compose.yml` are included. The compose file publishes
to loopback by default; change the bind if your proxy is on another host, and
note that the compose file deliberately does **not** mount the Docker socket.
mailcow's own `dockerapi` container does, and copying that pattern into an
internet-reachable service would hand socket access — and therefore root — to
anything that compromises it.

### 5. Add the connector

In Claude: Settings → Connectors → Add custom connector, with the URL from
`MCP_PUBLIC_URL`. Claude registers itself via dynamic client registration, then
sends you to the consent screen. In ChatGPT the equivalent lives under
Developer Mode.

---

## Verifying it

`tests/integration/http-oauth.test.js` drives the whole flow against a real
listening server — discovery, registration, consent, code exchange,
authenticated `initialize`, refresh and revocation — and asserts the negative
cases that matter:

- an unauthenticated request is rejected, with `WWW-Authenticate` pointing at
  the resource metadata
- a forged bearer token is rejected
- a wrong operator password yields no code
- a token exchange with a mismatched PKCE verifier fails
- an authorization code cannot be replayed
- a consumed refresh token stops working
- two clients can be connected at once, and both serve requests
- a token from one grant cannot drive another grant's session, on either the
  POST endpoint or the event stream
- a read-only token is refused a write tool and allowed a read tool
- a refresh cannot widen its own scope
- revoking an access token also kills its refresh token
- a malformed or oversized body returns no stack trace
- the consent route never answers 429, and still accepts the correct password
  after repeated failures

```bash
npm run build && node tests/integration/http-oauth.test.js
```

An auth layer that accepts valid credentials proves very little. The negative
cases are the test.
