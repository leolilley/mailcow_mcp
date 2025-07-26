import { APIClient } from '../client';
import {
  MailcowDomain,
  ListDomainsParams,
  CreateDomainRequest,
  UpdateDomainRequest,
  APIAction,
} from '../../types';
import { buildDomainEndpoint } from '../endpoints';

export class DomainAPI {
  constructor(private client: APIClient) {}

  async listDomains(params?: ListDomainsParams): Promise<MailcowDomain[]> {
    return this.client.get<MailcowDomain[]>(
      buildDomainEndpoint(APIAction.LIST),
      { params }
    );
  }

  async createDomain(domain: CreateDomainRequest): Promise<MailcowDomain> {
    return this.client.post<MailcowDomain>(
      buildDomainEndpoint(APIAction.CREATE),
      domain
    );
  }

  async updateDomain(domainId: string, updates: UpdateDomainRequest): Promise<MailcowDomain> {
    const payload = { ...updates, domain: domainId };
    return this.client.post<MailcowDomain>(
      buildDomainEndpoint(APIAction.UPDATE),
      payload
    );
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.client.post<void>(buildDomainEndpoint(APIAction.DELETE), {
      domain: domainId,
    });
  }

  async getDomainDetails(domainId: string): Promise<MailcowDomain> {
    const domains = await this.client.get<MailcowDomain[]>(
      buildDomainEndpoint(APIAction.GET)
    );
    const domain = domains.find((d) => d.domain === domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }
    return domain;
  }
} 