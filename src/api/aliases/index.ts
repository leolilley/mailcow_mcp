import { APIClient } from '../client';
import {
  MailcowAlias,
  ListAliasesParams,
  CreateAliasRequest,
  UpdateAliasRequest,
  APIAction,
} from '../../types';
import { buildAliasEndpoint } from '../endpoints';

export class AliasAPI {
  constructor(private client: APIClient) {}

  async listAliases(params?: ListAliasesParams): Promise<MailcowAlias[]> {
    return this.client.get<MailcowAlias[]>(buildAliasEndpoint(APIAction.LIST), {
      params,
    });
  }

  async createAlias(alias: CreateAliasRequest): Promise<MailcowAlias> {
    return this.client.post<MailcowAlias>(
      buildAliasEndpoint(APIAction.CREATE),
      alias
    );
  }

  async updateAlias(
    aliasId: string,
    updates: UpdateAliasRequest
  ): Promise<MailcowAlias> {
    const payload = { ...updates, alias: aliasId };
    return this.client.post<MailcowAlias>(
      buildAliasEndpoint(APIAction.UPDATE),
      payload
    );
  }

  async deleteAlias(aliasId: string): Promise<void> {
    await this.client.post<void>(buildAliasEndpoint(APIAction.DELETE), {
      alias: aliasId,
    });
  }

  async getAliasDetails(aliasId: string): Promise<MailcowAlias> {
    const aliases = await this.client.get<MailcowAlias[]>(
      buildAliasEndpoint(APIAction.GET)
    );
    const alias = aliases.find((a) => a.address === aliasId);
    if (!alias) {
      throw new Error(`Alias not found: ${aliasId}`);
    }
    return alias;
  }

  async getUserAliases(username: string): Promise<MailcowAlias[]> {
    const aliases = await this.client.get<MailcowAlias[]>(
      buildAliasEndpoint(APIAction.GET)
    );
    return aliases.filter((a) => a.goto.includes(username));
  }
}