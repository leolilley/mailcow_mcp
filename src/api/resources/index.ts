import { APIClient } from '../client';
import { MailcowService, ListResourcesParams, APIAction } from '../../types';
import { buildResourceEndpoint } from '../endpoints';

export class ResourcesAPI {
  constructor(private client: APIClient) {}

  async listServices(params?: ListResourcesParams): Promise<MailcowService[]> {
    return this.client.get<MailcowService[]>(
      buildResourceEndpoint(APIAction.LIST),
      { params }
    );
  }

  async getServiceDetails(serviceName: string): Promise<MailcowService> {
    const services = await this.client.get<MailcowService[]>(
      buildResourceEndpoint(APIAction.GET)
    );
    const service = services.find((s) => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    return service;
  }

  async getServicesByCategory(
    category: 'mail' | 'database' | 'web' | 'antispam' | 'monitoring'
  ): Promise<MailcowService[]> {
    const services = await this.client.get<MailcowService[]>(
      buildResourceEndpoint(APIAction.GET)
    );
    return services.filter((service) => service.category === category);
  }
}