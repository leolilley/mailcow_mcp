/**
 * Tool Exposure Policy
 *
 * Decides which tools a given deployment is allowed to register.
 *
 * The policy exists because this server can be reached in two very different
 * ways. Over stdio it is a local process launched by a desktop client, and the
 * only caller is the user. Over Streamable HTTP it is a network service that an
 * LLM vendor's infrastructure connects to, and the model driving it may have
 * read attacker-authored content — an email body, a queued message, a log line.
 *
 * A tool that destroys mail is therefore not the same risk in those two
 * deployments, and the policy is what distinguishes them.
 *
 * Tools are filtered at *registration* time rather than refused at call time.
 * A tool that is not registered does not appear in `tools/list`, so a model
 * cannot see that it exists, cannot be persuaded to call it, and cannot report
 * to a user that it was blocked. Refusing at call time leaks the surface.
 */

/**
 * Tools that permanently destroy data, or that break mail flow in a way the
 * estate will not notice until deliverability degrades.
 *
 * `update_dkim_key` is in this list and that is deliberate. Rotating a DKIM key
 * does not look destructive — nothing is deleted and the panel reports success —
 * but signing breaks the moment the key changes and stays broken until DNS
 * propagates. Mail keeps flowing while receivers start failing DMARC, and no
 * alert fires. It is the most dangerous tool here precisely because it is quiet.
 */
export const DESTRUCTIVE_TOOLS: readonly string[] = [
  'delete_domain',
  'delete_mailbox',
  'delete_user',
  'delete_dkim_key',
  'update_dkim_key',
  'delete_queue_items',
  'delete_sync_job',

  // The two below are an "update" and a "create", and gating them is not
  // obvious until you look at what their inputs allow.
  //
  // update_domain can set `active: 0`, which stops mail flow for every mailbox
  // under the domain and destroys nothing, so it reads as a routine edit. That
  // is the same quiet-breakage argument made for update_dkim_key above.
  //
  // create_dkim_key is here because mailcow's /api/v1/add/dkim is not
  // documented to reject a domain that already holds a key. If it regenerates
  // instead, "create" reproduces exactly the DMARC breakage update_dkim_key is
  // gated for. Gated until someone verifies the behaviour against a real
  // mailcow; if it does reject, it can move back to the write tier.
  //
  // Note that update_mailbox and update_user are NOT here. They are in
  // CREDENTIAL_TOOLS, for the reasons set out on that list. Worth knowing when
  // reading this one: update_mailbox can also set `active: 0` on a single
  // mailbox, so enabling the credential group alone is enough to stop one
  // mailbox's mail silently, even though that group is described as tools that
  // destroy nothing.
  'update_domain',
  'create_dkim_key',
] as const;

/**
 * Tools that set or accept a credential.
 *
 * Separate from DESTRUCTIVE because the remedy and the appetite differ. These
 * destroy nothing — which is exactly why a deny-list built around the word
 * "delete" misses every one of them — but each mints or changes an identity
 * that can then authenticate to the mail system directly, outside this server
 * and outside anything a model or an approval dialog can mediate.
 *
 *   update_mailbox / update_user  set the password of an EXISTING mailbox.
 *     Reset postmaster@ and whoever reads the new password owns the domain:
 *     they read all of its mail, send authenticated mail from it, and delete
 *     what they like. No delete tool and no send_email required.
 *
 *   create_mailbox / create_user  mint a NEW authenticated identity on a
 *     domain recipients already trust. billing@yourcompany.example with a
 *     known password is a phishing primitive, again without send_email.
 *
 *   create_sync_job / update_sync_job  accept third-party IMAP credentials
 *     and pull remote mail into a local mailbox.
 *
 * Enabled separately so an operator can have mailbox administration without
 * also exposing deletion, which is the common case.
 */
export const CREDENTIAL_TOOLS: readonly string[] = [
  'update_mailbox',
  'update_user',
  'create_mailbox',
  'create_user',
  'create_sync_job',
  'update_sync_job',
] as const;

/**
 * Tools that cannot destroy anything but can be abused to act outwardly in the
 * operator's name.
 *
 * `send_email` is the whole category. A model that has read an injected
 * instruction can be steered into sending mail from a domain the recipient
 * trusts, which is a phishing primitive rather than an outage. It is separated
 * from DESTRUCTIVE because the remedy differs: destruction is about data loss,
 * this is about reputation and abuse.
 */
export const OUTBOUND_TOOLS: readonly string[] = ['send_email'] as const;

export type ToolTier = 'read' | 'write' | 'destructive' | 'credential' | 'outbound';

export interface ToolPolicyOptions {
  /** True when the server is reachable over the network rather than stdio. */
  remote: boolean;
  /** Opt-in for the tools in DESTRUCTIVE_TOOLS. Defaults to false. */
  enableDestructive: boolean;
  /** Opt-in for the tools in CREDENTIAL_TOOLS. Defaults to false. */
  enableCredential: boolean;
  /** Opt-in for the tools in OUTBOUND_TOOLS. Defaults to false. */
  enableOutbound: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  tier: ToolTier;
  /** Populated only when `allowed` is false. Safe to log. */
  reason?: string;
}

/**
 * Classify a tool by name.
 *
 * Classification is by explicit list rather than by matching on `delete_`,
 * because the two tools most worth gating — `update_dkim_key` and `send_email`
 * — would both pass a prefix check.
 */
export function tierOf(toolName: string): ToolTier {
  if (DESTRUCTIVE_TOOLS.includes(toolName)) return 'destructive';
  if (CREDENTIAL_TOOLS.includes(toolName)) return 'credential';
  if (OUTBOUND_TOOLS.includes(toolName)) return 'outbound';
  // Anchored on the separator on purpose. Without the underscore a future
  // `listen_*`, `checkout_*` or `getaway_*` would be classed read, and so be
  // reachable with a mailcow:read token.
  if (/^(list|get|check|test|health)(_|$)/.test(toolName)) return 'read';
  return 'write';
}

/**
 * OAuth scope a tool requires.
 *
 * Derived from `tierOf` rather than listed separately, so a new tool cannot be
 * classified as a write for registration purposes and a read for authorization
 * purposes. Anything not demonstrably read-only needs the write scope: the
 * default is the restrictive one, so a tool whose name does not match the read
 * prefixes fails closed rather than slipping through unscoped.
 */
export function scopeFor(toolName: string): 'mailcow:read' | 'mailcow:write' {
  return tierOf(toolName) === 'read' ? 'mailcow:read' : 'mailcow:write';
}

/**
 * Tool exposure policy.
 *
 * Construct once at startup and consult before every `register()` call.
 */
export class ToolPolicy {
  constructor(private readonly options: ToolPolicyOptions) {}

  /** Whether a tool may be registered in this deployment. */
  evaluate(toolName: string): PolicyDecision {
    const tier = tierOf(toolName);

    // Over stdio every tool is registered, which is the behaviour that existed
    // before this policy and the behaviour this policy's whole argument rests
    // on: the caller is the user who launched the process, and the exposure
    // these flags exist to manage does not exist.
    //
    // This check was missing, and its absence was not a small bug. `remote`
    // was read only by warnings(), so the opt-in flags gated stdio as well,
    // and every existing desktop user silently lost all nine destructive
    // tools, all six credential tools and send_email on upgrade. No error, no
    // migration note: the tools were simply absent from tools/list, and a call
    // came back "not found".
    if (!this.options.remote) {
      return { allowed: true, tier };
    }

    if (tier === 'destructive' && !this.options.enableDestructive) {
      return {
        allowed: false,
        tier,
        reason:
          'destructive tools are disabled; set MCP_ENABLE_DESTRUCTIVE_TOOLS=true to enable',
      };
    }

    if (tier === 'credential' && !this.options.enableCredential) {
      return {
        allowed: false,
        tier,
        reason:
          'credential-setting tools are disabled; set MCP_ENABLE_CREDENTIAL_TOOLS=true to enable',
      };
    }

    if (tier === 'outbound' && !this.options.enableOutbound) {
      return {
        allowed: false,
        tier,
        reason:
          'outbound mail tools are disabled; set MCP_ENABLE_OUTBOUND_TOOLS=true to enable',
      };
    }

    return { allowed: true, tier };
  }

  isAllowed(toolName: string): boolean {
    return this.evaluate(toolName).allowed;
  }

  /**
   * Warnings to emit at startup.
   *
   * Returned rather than logged so the caller owns the logger, and so this stays
   * testable without capturing output.
   */
  warnings(): string[] {
    const out: string[] = [];

    if (this.options.enableDestructive && this.options.remote) {
      out.push(
        'DESTRUCTIVE TOOLS ARE ENABLED ON A NETWORK-REACHABLE TRANSPORT. ' +
          `Tools that can permanently destroy mail (${DESTRUCTIVE_TOOLS.join(', ')}) ` +
          'are callable by a model that may have read untrusted content. ' +
          'Confirm the OAuth configuration and the mailcow API key scope before relying on this.',
      );
    }

    if (this.options.enableCredential && this.options.remote) {
      out.push(
        'CREDENTIAL TOOLS ARE ENABLED ON A NETWORK-REACHABLE TRANSPORT. ' +
          `Tools that set mailbox passwords (${CREDENTIAL_TOOLS.join(', ')}) ` +
          'can mint or take over an identity that then authenticates to the mail ' +
          'system directly, outside this server.',
      );
    }

    if (this.options.enableOutbound && this.options.remote) {
      out.push(
        'OUTBOUND MAIL TOOLS ARE ENABLED ON A NETWORK-REACHABLE TRANSPORT. ' +
          'A model that has read untrusted content can be steered into sending mail ' +
          'from your domains.',
      );
    }

    return out;
  }

  /** Summary for the startup log line. */
  describe(): Record<string, unknown> {
    return {
      remote: this.options.remote,
      destructiveToolsEnabled: this.options.enableDestructive,
      credentialToolsEnabled: this.options.enableCredential,
      outboundToolsEnabled: this.options.enableOutbound,
      destructiveTools: DESTRUCTIVE_TOOLS,
      credentialTools: CREDENTIAL_TOOLS,
      outboundTools: OUTBOUND_TOOLS,
    };
  }
}
