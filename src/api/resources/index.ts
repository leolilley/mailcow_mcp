import { APIClient } from '../client';
import { MailcowService, ListResourcesParams } from '../../types';

export class ResourcesAPI {
  constructor(private client: APIClient) {}

  async listServices(params?: ListResourcesParams): Promise<MailcowService[]> {
    return this.client.get<MailcowService[]>('/api/v1/get/services', params as Record<string, unknown>);
  }

  async getServiceDetails(serviceName: string): Promise<MailcowService> {
    const services = await this.client.get<MailcowService[]>('/api/v1/get/services');
    const service = services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    return service;
  }

  async getServicesByCategory(category: 'mail' | 'database' | 'web' | 'antispam' | 'monitoring'): Promise<MailcowService[]> {
    const services = await this.client.get<MailcowService[]>('/api/v1/get/services');
    return services.filter(service => service.category === category);
  }
} 