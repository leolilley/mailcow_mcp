/**
 * DKIM API
 * Handles DKIM key management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowDKIM, 
  CreateDKIMRequest, 
  UpdateDKIMRequest, 
  ListDKIMParams,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildDKIMEndpoint } from '../endpoints';

/**
 * DKIM API class for managing Mailcow DKIM keys
 */
export class DKIMAPI {
  constructor(private client: APIClient) {}

  /**
   * List all DKIM keys with optional filtering
   */
  async listDKIMKeys(params?: ListDKIMParams): Promise<MailcowDKIM[]> {
    const response = await this.client.get<MailcowDKIM[]>(
      buildDKIMEndpoint('list'),
      { params }
    );
    return response;
  }

  /**
   * Get a specific DKIM key by domain and selector
   */
  async getDKIMKey(domain: string, selector: string): Promise<MailcowDKIM | null> {
    const keys = await this.listDKIMKeys({ domain, selector });
    return keys.find(key => key.domain === domain && key.selector === selector) || null;
  }

  /**
   * Get DKIM keys by domain
   */
  async getDKIMKeysByDomain(domain: string): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ domain });
  }

  /**
   * Create a new DKIM key
   */
  async createDKIMKey(dkimData: CreateDKIMRequest): Promise<MailcowDKIM> {
    const response = await this.client.post<MailcowDKIM>(
      buildDKIMEndpoint('create'),
      dkimData
    );
    return response;
  }

  /**
   * Update an existing DKIM key
   */
  async updateDKIMKey(domain: string, selector: string, dkimData: UpdateDKIMRequest): Promise<MailcowDKIM> {
    const response = await this.client.post<MailcowDKIM>(
      buildDKIMEndpoint('update'),
      { domain, selector, ...dkimData }
    );
    return response;
  }

  /**
   * Delete a DKIM key
   */
  async deleteDKIMKey(domain: string, selector: string): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildDKIMEndpoint('delete'),
      { domain, selector }
    );
    return response.success;
  }

  /**
   * Activate a DKIM key
   */
  async activateDKIMKey(domain: string, selector: string): Promise<MailcowDKIM> {
    return this.updateDKIMKey(domain, selector, { active: true });
  }

  /**
   * Deactivate a DKIM key
   */
  async deactivateDKIMKey(domain: string, selector: string): Promise<MailcowDKIM> {
    return this.updateDKIMKey(domain, selector, { active: false });
  }

  /**
   * Update DKIM key algorithm
   */
  async updateDKIMAlgorithm(domain: string, selector: string, algorithm: 'rsa' | 'ed25519'): Promise<MailcowDKIM> {
    return this.updateDKIMKey(domain, selector, { algorithm });
  }

  /**
   * Update DKIM key size
   */
  async updateDKIMKeySize(domain: string, selector: string, keySize: number): Promise<MailcowDKIM> {
    return this.updateDKIMKey(domain, selector, { key_size: keySize });
  }

  /**
   * Get active DKIM keys
   */
  async getActiveDKIMKeys(): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ active: true });
  }

  /**
   * Get inactive DKIM keys
   */
  async getInactiveDKIMKeys(): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ active: false });
  }

  /**
   * Get DKIM keys by algorithm
   */
  async getDKIMKeysByAlgorithm(algorithm: 'rsa' | 'ed25519'): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ algorithm });
  }

  /**
   * Get DKIM keys created after a specific date
   */
  async getDKIMKeysCreatedAfter(date: Date): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ created_after: date });
  }

  /**
   * Get DKIM keys created before a specific date
   */
  async getDKIMKeysCreatedBefore(date: Date): Promise<MailcowDKIM[]> {
    return this.listDKIMKeys({ created_before: date });
  }

  /**
   * Generate DKIM DNS record for a key
   */
  generateDKIMDNSRecord(dkim: MailcowDKIM): string {
    const selector = dkim.selector;
    const domain = dkim.domain;
    const publicKey = dkim.public_key;
    
    return `${selector}._domainkey.${domain} IN TXT "v=DKIM1; k=${dkim.algorithm}; p=${publicKey}"`;
  }

  /**
   * Validate DKIM key configuration
   */
  validateDKIMKey(dkim: MailcowDKIM): boolean {
    return (
      dkim.domain.length > 0 &&
      dkim.selector.length > 0 &&
      dkim.public_key.length > 0 &&
      (dkim.algorithm === 'rsa' || dkim.algorithm === 'ed25519') &&
      dkim.key_size > 0
    );
  }
} 