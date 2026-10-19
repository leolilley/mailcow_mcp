/**
 * The stdio deployment must expose every tool.
 *
 * Run with: node tests/integration/stdio-tool-inventory.test.js
 *
 * This exists because of a regression that was invisible from the inside. The
 * tool exposure policy is built around a transport distinction: over stdio the
 * caller is the user who launched the process, while over HTTP the caller is a
 * model that may have just read an attacker-authored email. But `evaluate()`
 * never actually read the `remote` flag, so the opt-in flags gated stdio too.
 *
 * The effect on an existing desktop user upgrading was that all nine
 * destructive tools, all six credential tools and `send_email` disappeared.
 * Not an error, not a warning: absent from `tools/list`, and a call returning
 * "not found". Every unit test passed, because they all constructed the policy
 * with `remote: true`.
 *
 * So this test speaks the protocol over a real stdio pipe, the way a desktop
 * client does, and asserts the whole inventory is present.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

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

/** Tools that are withheld over HTTP and must NOT be withheld over stdio. */
const GATED_TOOLS = [
  // destructive
  'delete_domain',
  'delete_mailbox',
  'delete_user',
  'delete_dkim_key',
  'update_dkim_key',
  'delete_queue_items',
  'delete_sync_job',
  'update_domain',
  'create_dkim_key',
  // credential-setting
  'update_mailbox',
  'update_user',
  'create_mailbox',
  'create_user',
  'create_sync_job',
  'update_sync_job',
  // outbound
  'send_email',
];

function listToolsOverStdio(extraEnv) {
  return new Promise((resolve, reject) => {
    const entry = path.join(__dirname, '..', '..', 'dist', 'src', 'index.js');
    const child = spawn(process.execPath, [entry], {
      env: {
        ...process.env,
        // No MCP_TRANSPORT at all: this is the default path a desktop client
        // launches, and the one the regression broke.
        MAILCOW_API_KEY: 'TESTKEY-0000000000000000000000000000',
        MAILCOW_API_URL: 'http://127.0.0.1:9',
        LOG_LEVEL: 'error',
        ...extraEnv,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timed out; stdout:\n${out}\nstderr:\n${err}`));
    }, 30000);

    child.stdout.on('data', (d) => {
      out += d;
      // The server logs non-protocol lines to stdout (pre-existing), so scan
      // line by line for the response rather than parsing the whole stream.
      for (const line of out.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        let msg;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (msg.id === 2 && msg.result?.tools) {
          clearTimeout(timer);
          child.kill('SIGTERM');
          resolve(msg.result.tools.map((t) => t.name));
          return;
        }
      }
    });
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);

    const send = (obj) => child.stdin.write(`${JSON.stringify(obj)}\n`);
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'stdio-inventory-test', version: '0' },
      },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  });
}

async function main() {
  const names = await listToolsOverStdio({});

  check('stdio serves a tool list', names.length > 0, `got ${names.length}`);

  const missing = GATED_TOOLS.filter((t) => !names.includes(t));
  check(
    'stdio exposes every tool the HTTP transport gates',
    missing.length === 0,
    missing.length ? `missing ${missing.length}: ${missing.join(', ')}` : '',
  );

  // The count is asserted as a floor rather than an exact number so that
  // adding a tool does not fail this test, while removing one silently does.
  check(
    'stdio exposes the full inventory',
    names.length >= 42,
    `expected at least 42 tools, got ${names.length}`,
  );

  // The flags are an HTTP concern. Setting them false explicitly, which is
  // what .env.example ships, must not change the stdio inventory.
  const withFlagsOff = await listToolsOverStdio({
    MCP_ENABLE_DESTRUCTIVE_TOOLS: 'false',
    MCP_ENABLE_CREDENTIAL_TOOLS: 'false',
    MCP_ENABLE_OUTBOUND_TOOLS: 'false',
  });
  check(
    'the exposure flags do not apply to stdio',
    withFlagsOff.length === names.length,
    `${names.length} without the flags, ${withFlagsOff.length} with them off`,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
