import { APIClient } from '../client';
import { MailcowLogEntry, LogFilter, APIAction } from '../../types';
import { buildLogEndpoint } from '../endpoints';

export class LogsAPI {
  constructor(private client: APIClient) {}

  async getLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    return this.client.get<MailcowLogEntry[]>(
      buildLogEndpoint(APIAction.LIST),
      { params }
    );
  }

  async getAccessLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, service: 'access' };
    return this.client.get<MailcowLogEntry[]>(
      buildLogEndpoint(APIAction.LIST),
      { params: filterParams }
    );
  }

  async getErrorLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, level: 'error' };
    return this.client.get<MailcowLogEntry[]>(
      buildLogEndpoint(APIAction.LIST),
      { params: filterParams }
    );
  }

  async getPerformanceLogs(params?: LogFilter): Promise<MailcowLogEntry[]> {
    const filterParams = { ...params, service: 'performance' };
    return this.client.get<MailcowLogEntry[]>(
      buildLogEndpoint(APIAction.LIST),
      { params: filterParams }
    );
  }
}