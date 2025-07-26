import { APIClient } from '../client';
import { MailcowLogEntry, LogFilter } from '../../types';

export class LogsAPI {
  constructor(private client: APIClient) {}

  async getLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    return this.client.get<MailcowLogEntry[]>('/api/v1/get/logs', params as Record<string, unknown>);
  }

  async getAccessLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, service: 'access' };
    return this.client.get<MailcowLogEntry[]>('/api/v1/get/logs', filterParams as Record<string, unknown>);
  }

  async getErrorLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, level: 'error' };
    return this.client.get<MailcowLogEntry[]>('/api/v1/get/logs', filterParams as Record<string, unknown>);
  }

  async getPerformanceLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, service: 'performance' };
    return this.client.get<MailcowLogEntry[]>('/api/v1/get/logs', filterParams as Record<string, unknown>);
  }
} 