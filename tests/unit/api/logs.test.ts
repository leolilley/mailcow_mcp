import { LogsAPI } from '../../../src/api/logs';
import { APIClient } from '../../../src/api/client';

describe('LogsAPI', () => {
  let get: jest.Mock;
  let api: LogsAPI;

  beforeEach(() => {
    get = jest.fn();
    api = new LogsAPI({ get } as unknown as APIClient);
  });

  describe('endpoint selection', () => {
    it('requests /api/v1/get/logs/{type}/{count} for postfix', async () => {
      get.mockResolvedValue([]);
      await api.getLogs({ service: 'postfix', limit: 50 });
      expect(get).toHaveBeenCalledWith('/api/v1/get/logs/postfix/50');
    });

    it('defaults to postfix when no service is given', async () => {
      get.mockResolvedValue([]);
      await api.getLogs();
      expect(get).toHaveBeenCalledWith('/api/v1/get/logs/postfix/100');
    });

    it('maps "rspamd" to the rspamd-history endpoint', async () => {
      get.mockResolvedValue([]);
      await api.getLogs({ service: 'rspamd', limit: 10 });
      expect(get).toHaveBeenCalledWith('/api/v1/get/logs/rspamd-history/10');
    });

    it('uses dovecot for access logs and watchdog for performance logs', async () => {
      get.mockResolvedValue([]);
      await api.getAccessLogs({ limit: 5 });
      await api.getPerformanceLogs({ limit: 5 });
      expect(get).toHaveBeenNthCalledWith(1, '/api/v1/get/logs/dovecot/5');
      expect(get).toHaveBeenNthCalledWith(2, '/api/v1/get/logs/watchdog/5');
    });

    it('rejects unknown services with a helpful message', async () => {
      await expect(api.getLogs({ service: 'nope' })).rejects.toThrow(/Unknown log service 'nope'/);
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('normalisation', () => {
    it('maps postfix entries (time is a unix-seconds string)', async () => {
      get.mockResolvedValue([
        { message: 'EF1711500458: removed', priority: 'info', program: 'postfix/qmgr', time: '1569937433' },
        { message: 'lookup error', priority: 'warning', program: 'postfix/dnsblog', time: '1569937434' },
        { message: 'fatal', priority: 'err', program: 'postfix/smtpd', time: '1569937435' },
      ]);
      const logs = await api.getLogs({ service: 'postfix' });
      expect(logs.map(l => l.level)).toEqual(['info', 'warn', 'error']);
      expect(logs[0].service).toBe('postfix/qmgr');
      expect(logs[0].message).toBe('EF1711500458: removed');
      expect(logs[0].timestamp).toEqual(new Date(1569937433 * 1000));
    });

    it('formats rspamd-history entries (unix_time, sender/rcpt/score)', async () => {
      get.mockResolvedValue([
        {
          unix_time: 1790769648,
          sender_smtp: 'a@example.org',
          rcpt_smtp: ['b@example.com'],
          subject: 'Hello',
          score: 0.09,
          required_score: 15,
          action: 'no action',
        },
      ]);
      const [entry] = await api.getLogs({ service: 'rspamd' });
      expect(entry.service).toBe('rspamd-history');
      expect(entry.message).toBe('a@example.org -> b@example.com "Hello" score 0.09/15 no action');
      expect(entry.timestamp).toEqual(new Date(1790769648 * 1000));
    });

    it('formats watchdog entries, which have no message field', async () => {
      get.mockResolvedValue([
        { hpdiff: '0', hpnow: '5', hptotal: '5', lvl: '100', service: 'Rspamd', time: '1569938956' },
        { hpdiff: '-1', hpnow: '3', hptotal: '5', lvl: '100', service: 'Fail2ban', time: '1569938958' },
      ]);
      const logs = await api.getPerformanceLogs();
      expect(logs[0].message).toBe('Rspamd: 5/5 healthy (diff 0, lvl 100)');
      expect(logs[0].level).toBe('info');
      expect(logs[1].service).toBe('Fail2ban');
      expect(logs[1].level).toBe('warn');
    });

    it('returns an empty list for non-array responses', async () => {
      get.mockResolvedValue({ type: 'error' });
      await expect(api.getLogs()).resolves.toEqual([]);
    });
  });

  describe('filtering and paging', () => {
    const entries = [
      { message: 'new', priority: 'info', program: 'postfix/x', time: '2000' },
      { message: 'mid', priority: 'err', program: 'postfix/x', time: '1500' },
      { message: 'old', priority: 'info', program: 'postfix/x', time: '1000' },
    ];

    it('fetches more entries than requested when a time filter is set', async () => {
      get.mockResolvedValue(entries);
      await api.getLogs({ limit: 10, start_time: new Date(1200 * 1000) });
      expect(get).toHaveBeenCalledWith('/api/v1/get/logs/postfix/1000');
    });

    it('filters by start/end time and level client-side', async () => {
      get.mockResolvedValue(entries);
      const inRange = await api.getLogs({
        start_time: new Date(1200 * 1000),
        end_time: new Date(1800 * 1000),
      });
      expect(inRange.map(l => l.message)).toEqual(['mid']);

      const errors = await api.getLogs({ level: 'error' });
      expect(errors.map(l => l.message)).toEqual(['mid']);
    });

    it('applies offset and limit', async () => {
      get.mockResolvedValue(entries);
      const page = await api.getLogs({ limit: 1, offset: 1 });
      expect(page.map(l => l.message)).toEqual(['mid']);
    });

    it('getErrorLogs returns only error and warn entries', async () => {
      get.mockResolvedValue([
        ...entries,
        { message: 'careful', priority: 'warning', program: 'postfix/x', time: '900' },
      ]);
      const logs = await api.getErrorLogs();
      expect(logs.map(l => l.message)).toEqual(['mid', 'careful']);
    });
  });
});
