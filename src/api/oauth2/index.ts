/**
 * OAuth2 API
 * Handles OAuth2 client management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowOAuth2Client, 
  CreateOAuth2Request, 
  UpdateOAuth2Request, 
  ListOAuth2Params,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildOAuth2Endpoint } from '../endpoints';
import { APIAction } from '../../types/api';

/**
 * OAuth2 API class for managing Mailcow OAuth2 clients
 */
export class OAuth2API {
  constructor(private client: APIClient) {}

  /**
   * List all OAuth2 clients with optional filtering
   */
  async listOAuth2Clients(
    params?: ListOAuth2Params
  ): Promise<MailcowOAuth2Client[]> {
    const response = await this.client.get<MailcowOAuth2Client[]>(
      buildOAuth2Endpoint(APIAction.LIST),
      { params }
    );
    return response;
  }

  /**
   * Get a specific OAuth2 client by client ID
   */
  async getOAuth2Client(clientId: string): Promise<MailcowOAuth2Client | null> {
    const clients = await this.listOAuth2Clients({ client_id: clientId });
    return clients.find((client) => client.client_id === clientId) || null;
  }

  /**
   * Get OAuth2 clients by name
   */
  async getOAuth2ClientsByName(name: string): Promise<MailcowOAuth2Client[]> {
    return this.listOAuth2Clients({ name });
  }

  /**
   * Create a new OAuth2 client
   */
  async createOAuth2Client(
    clientData: CreateOAuth2Request
  ): Promise<MailcowOAuth2Client> {
    const response = await this.client.post<MailcowOAuth2Client>(
      buildOAuth2Endpoint(APIAction.CREATE),
      clientData
    );
    return response;
  }

  /**
   * Update an existing OAuth2 client
   */
  async updateOAuth2Client(
    clientId: string,
    clientData: UpdateOAuth2Request
  ): Promise<MailcowOAuth2Client> {
    const response = await this.client.post<MailcowOAuth2Client>(
      buildOAuth2Endpoint(APIAction.UPDATE),
      { client_id: clientId, ...clientData }
    );
    return response;
  }

  /**
   * Delete an OAuth2 client
   */
  async deleteOAuth2Client(clientId: string): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildOAuth2Endpoint(APIAction.DELETE),
      { client_id: clientId }
    );
    return response.success;
  }

  /**
   * Activate an OAuth2 client
   */
  async activateOAuth2Client(clientId: string): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { active: true });
  }

  /**
   * Deactivate an OAuth2 client
   */
  async deactivateOAuth2Client(clientId: string): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { active: false });
  }

  /**
   * Update OAuth2 client name
   */
  async updateOAuth2ClientName(
    clientId: string,
    name: string
  ): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { name });
  }

  /**
   * Update OAuth2 client description
   */
  async updateOAuth2ClientDescription(
    clientId: string,
    description: string
  ): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { description });
  }

  /**
   * Update OAuth2 client redirect URIs
   */
  async updateOAuth2ClientRedirectURIs(
    clientId: string,
    redirectUris: string[]
  ): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { redirect_uris: redirectUris });
  }

  /**
   * Update OAuth2 client scopes
   */
  async updateOAuth2ClientScopes(
    clientId: string,
    scopes: string[]
  ): Promise<MailcowOAuth2Client> {
    return this.updateOAuth2Client(clientId, { scopes });
  }

  /**
   * Get active OAuth2 clients
   */
  async getActiveOAuth2Clients(): Promise<MailcowOAuth2Client[]> {
    return this.listOAuth2Clients({ active: true });
  }

  /**
   * Get inactive OAuth2 clients
   */
  async getInactiveOAuth2Clients(): Promise<MailcowOAuth2Client[]> {
    return this.listOAuth2Clients({ active: false });
  }

  /**
   * Get OAuth2 clients created after a specific date
   */
  async getOAuth2ClientsCreatedAfter(
    date: Date
  ): Promise<MailcowOAuth2Client[]> {
    return this.listOAuth2Clients({ created_after: date });
  }

  /**
   * Get OAuth2 clients created before a specific date
   */
  async getOAuth2ClientsCreatedBefore(
    date: Date
  ): Promise<MailcowOAuth2Client[]> {
    return this.listOAuth2Clients({ created_before: date });
  }

  /**
   * Validate OAuth2 client configuration
   */
  validateOAuth2Client(client: MailcowOAuth2Client): boolean {
    return (
      client.client_id.length > 0 &&
      client.name.length > 0 &&
      Array.isArray(client.redirect_uris) &&
      client.redirect_uris.length > 0 &&
      Array.isArray(client.scopes) &&
      client.scopes.length > 0 &&
      typeof client.active === 'boolean'
    );
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateOAuth2AuthURL(
    client: MailcowOAuth2Client,
    redirectUri: string,
    state?: string
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: redirectUri,
      scope: client.scopes.join(' '),
    });

    if (state) {
      params.append('state', state);
    }

    return `/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Check if OAuth2 client has required scopes
   */
  hasRequiredScopes(
    client: MailcowOAuth2Client,
    requiredScopes: string[]
  ): boolean {
    return requiredScopes.every((scope) => client.scopes.includes(scope));
  }

  /**
   * Get OAuth2 client by redirect URI
   */
  async getOAuth2ClientByRedirectURI(
    redirectUri: string
  ): Promise<MailcowOAuth2Client | null> {
    const clients = await this.listOAuth2Clients();
    return (
      clients.find((client) => client.redirect_uris.includes(redirectUri)) ||
      null
    );
  }
} 