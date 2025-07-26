import { APIClient } from '../client';
import { MailcowSystemStatus, MailcowServiceStatus, MailcowBackupStatus, MailcowBackupRequest } from '../../types';

export class SystemAPI {
  constructor(private client: APIClient) {}

  async getSystemStatus(): Promise<MailcowSystemStatus> {
    return this.client.get<MailcowSystemStatus>('/api/v1/get/system/status');
  }

  async getServiceStatus(serviceName?: string): Promise<MailcowServiceStatus[]> {
    const response = await this.client.get<MailcowServiceStatus[]>('/api/v1/get/system/services');
    if (serviceName) {
      return response.filter(service => service.name === serviceName);
    }
    return response;
  }

  async restartService(serviceName: string): Promise<void> {
    await this.client.post<void>('/api/v1/edit/system/service', { 
      service: serviceName, 
      action: 'restart' 
    });
  }

  async getBackupStatus(): Promise<MailcowBackupStatus> {
    return this.client.get<MailcowBackupStatus>('/api/v1/get/system/backup');
  }

  async createBackup(backupRequest: MailcowBackupRequest): Promise<void> {
    await this.client.post<void>('/api/v1/add/system/backup', backupRequest);
  }
} 