import { APIClient } from '../client';
import { MailcowDomain, ListDomainsParams, CreateDomainRequest, UpdateDomainRequest } from '../../types';

export class DomainAPI {
  constructor(private client: APIClient) {}

  async listDomains(params?: ListDomainsParams): Promise<MailcowDomain[]> {
    return this.client.get<MailcowDomain[]>('/api/v1/get/domain', params as Record<string, unknown>);
  }

  async createDomain(domain: CreateDomainRequest): Promise<MailcowDomain> {
    return this.client.post<MailcowDomain>('/api/v1/add/domain', domain);
  }

  async updateDomain(domainId: string, updates: UpdateDomainRequest): Promise<MailcowDomain> {
    const payload = { ...updates, domain: domainId };
    return this.client.post<MailcowDomain>('/api/v1/edit/domain', payload);
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.client.post<void>('/api/v1/delete/domain', { domain: domainId });
  }

  async getDomainDetails(domainId: string): Promise<MailcowDomain> {
    const domains = await this.client.get<MailcowDomain[]>('/api/v1/get/domain');
    const domain = domains.find(d => d.domain === domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }
    return domain;
  }
} 