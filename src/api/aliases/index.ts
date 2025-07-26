import { APIClient } from '../client';
import { MailcowAlias, ListAliasesParams, CreateAliasRequest, UpdateAliasRequest } from '../../types';

export class AliasAPI {
  constructor(private client: APIClient) {}

  async listAliases(params?: ListAliasesParams): Promise<MailcowAlias[]> {
    return this.client.get<MailcowAlias[]>('/api/v1/get/alias', params as Record<string, unknown>);
  }

  async createAlias(alias: CreateAliasRequest): Promise<MailcowAlias> {
    return this.client.post<MailcowAlias>('/api/v1/add/alias', alias);
  }

  async updateAlias(aliasId: string, updates: UpdateAliasRequest): Promise<MailcowAlias> {
    const payload = { ...updates, alias: aliasId };
    return this.client.post<MailcowAlias>('/api/v1/edit/alias', payload);
  }

  async deleteAlias(aliasId: string): Promise<void> {
    await this.client.post<void>('/api/v1/delete/alias', { alias: aliasId });
  }

  async getAliasDetails(aliasId: string): Promise<MailcowAlias> {
    const aliases = await this.client.get<MailcowAlias[]>('/api/v1/get/alias');
    const alias = aliases.find(a => a.address === aliasId);
    if (!alias) {
      throw new Error(`Alias not found: ${aliasId}`);
    }
    return alias;
  }

  async getUserAliases(username: string): Promise<MailcowAlias[]> {
    const aliases = await this.client.get<MailcowAlias[]>('/api/v1/get/alias');
    return aliases.filter(a => a.goto.includes(username));
  }
} 