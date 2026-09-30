import { APIClient } from '../client';
import { MailcowLogEntry, LogFilter } from '../../types';

/**
 * Mailcow has no generic "logs" endpoint. Logs are fetched per type:
 *   GET /api/v1/get/logs/{type}/{count}
 * Filtering by time/level is not supported server-side, so it happens here.
 */
const LOG_TYPES: Record<string, string> = {
  postfix: 'postfix',
  dovecot: 'dovecot',
  rspamd: 'rspamd-history',
  'rspamd-history': 'rspamd-history',
  sogo: 'sogo',
  api: 'api',
  acme: 'acme',
  netfilter: 'netfilter',
  watchdog: 'watchdog',
  autodiscover: 'autodiscover',
  ratelimited: 'ratelimited',
};

const MAX_FETCH = 5000;
const FILTERED_MIN_FETCH = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function normalize(raw: Raw, type: string, index: number): MailcowLogEntry {
  const isRspamd = type === 'rspamd-history';
  const isWatchdog = type === 'watchdog';

  // rspamd-history uses unix_time, the others use time (both unix seconds)
  const ts = Number(raw.time ?? raw.unix_time ?? 0);

  let level: MailcowLogEntry['level'];
  if (isWatchdog) {
    level = Number(raw.hpnow) < Number(raw.hptotal) ? 'warn' : 'info';
  } else if (isRspamd) {
    level = 'info';
  } else if (['err', 'error', 'crit', 'alert', 'emerg'].includes(raw.priority)) {
    level = 'error';
  } else if (raw.priority === 'warning' || raw.priority === 'warn') {
    level = 'warn';
  } else if (raw.priority === 'debug') {
    level = 'debug';
  } else {
    level = 'info';
  }

  let message: string;
  if (isWatchdog) {
    message = `${raw.service}: ${raw.hpnow}/${raw.hptotal} healthy (diff ${raw.hpdiff}, lvl ${raw.lvl})`;
  } else if (isRspamd) {
    const rcpt = ([] as string[]).concat(raw.rcpt_smtp ?? []).join(',');
    message =
      `${raw.sender_smtp} -> ${rcpt} "${raw.subject}" ` +
      `score ${raw.score}/${raw.required_score} ${raw.action}`;
  } else {
    message = String(raw.message ?? '');
  }

  return {
    id: String(raw.id ?? `${type}-${ts}-${index}`),
    timestamp: new Date(ts * 1000),
    level,
    service: isWatchdog ? String(raw.service ?? type) : String(raw.program ?? type),
    message,
    details: raw,
  };
}

export class LogsAPI {
  constructor(private client: APIClient) {}

  private async fetchLogs(service: string, params: LogFilter = {}): Promise<MailcowLogEntry[]> {
    const type = LOG_TYPES[service];
    if (!type) {
      throw new Error(
        `Unknown log service '${service}'. Supported: ${Object.keys(LOG_TYPES).join(', ')}`
      );
    }

    const offset = Math.max(0, Number(params.offset ?? 0));
    const limit = Math.max(1, Number(params.limit ?? 100));
    const hasFilter = !!(params.start_time || params.end_time || params.level);

    const wanted = limit + offset;
    const count = Math.min(hasFilter ? Math.max(wanted, FILTERED_MIN_FETCH) : wanted, MAX_FETCH);

    const raw = await this.client.get<Raw[]>(`/api/v1/get/logs/${type}/${count}`);
    let entries = (Array.isArray(raw) ? raw : []).map((r, i) => normalize(r, type, i));

    if (params.start_time) entries = entries.filter(e => e.timestamp >= params.start_time!);
    if (params.end_time) entries = entries.filter(e => e.timestamp <= params.end_time!);
    if (params.level) entries = entries.filter(e => e.level === params.level);

    return entries.slice(offset, offset + limit);
  }

  async getLogs(params: LogFilter = {}): Promise<MailcowLogEntry[]> {
    return this.fetchLogs(params.service ?? 'postfix', params);
  }

  async getErrorLogs(params: LogFilter = {}): Promise<MailcowLogEntry[]> {
    const entries = await this.fetchLogs(params.service ?? 'postfix', { ...params, level: undefined });
    return entries.filter(e => e.level === 'error' || e.level === 'warn');
  }

  async getAccessLogs(params: LogFilter = {}): Promise<MailcowLogEntry[]> {
    return this.fetchLogs('dovecot', params);
  }

  async getPerformanceLogs(params: LogFilter = {}): Promise<MailcowLogEntry[]> {
    return this.fetchLogs('watchdog', params);
  }
}
