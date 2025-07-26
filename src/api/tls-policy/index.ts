/**
 * TLS Policy API
 * Handles TLS policy management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowTLSPolicy, 
  CreateTLSPolicyRequest, 
  UpdateTLSPolicyRequest, 
  ListTLSPolicyParams,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildTLSPolicyEndpoint } from '../endpoints';
import { APIAction } from '../../types/api';

/**
 * TLS Policy API class for managing Mailcow TLS policies
 */
export class TLSPolicyAPI {
  constructor(private client: APIClient) {}

  /**
   * List all TLS policies with optional filtering
   */
  async listTLSPolicies(
    params?: ListTLSPolicyParams
  ): Promise<MailcowTLSPolicy[]> {
    const response = await this.client.get<MailcowTLSPolicy[]>(
      buildTLSPolicyEndpoint(APIAction.LIST),
      { params }
    );
    return response;
  }

  /**
   * Get a specific TLS policy by domain
   */
  async getTLSPolicy(domain: string): Promise<MailcowTLSPolicy | null> {
    const policies = await this.listTLSPolicies({ domain });
    return policies.find((policy) => policy.domain === domain) || null;
  }

  /**
   * Create a new TLS policy
   */
  async createTLSPolicy(
    policyData: CreateTLSPolicyRequest
  ): Promise<MailcowTLSPolicy> {
    const response = await this.client.post<MailcowTLSPolicy>(
      buildTLSPolicyEndpoint(APIAction.CREATE),
      policyData
    );
    return response;
  }

  /**
   * Update an existing TLS policy
   */
  async updateTLSPolicy(
    domain: string,
    policyData: UpdateTLSPolicyRequest
  ): Promise<MailcowTLSPolicy> {
    const response = await this.client.post<MailcowTLSPolicy>(
      buildTLSPolicyEndpoint(APIAction.UPDATE),
      { domain, ...policyData }
    );
    return response;
  }

  /**
   * Delete a TLS policy
   */
  async deleteTLSPolicy(domain: string): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildTLSPolicyEndpoint(APIAction.DELETE),
      { domain }
    );
    return response.success;
  }

  /**
   * Activate a TLS policy
   */
  async activateTLSPolicy(domain: string): Promise<MailcowTLSPolicy> {
    return this.updateTLSPolicy(domain, { active: true });
  }

  /**
   * Deactivate a TLS policy
   */
  async deactivateTLSPolicy(domain: string): Promise<MailcowTLSPolicy> {
    return this.updateTLSPolicy(domain, { active: false });
  }

  /**
   * Update TLS policy type
   */
  async updateTLSPolicyType(
    domain: string,
    policy:
      | 'none'
      | 'may'
      | 'encrypt'
      | 'dane'
      | 'dane-only'
      | 'fingerprint'
      | 'verify'
      | 'secure'
  ): Promise<MailcowTLSPolicy> {
    return this.updateTLSPolicy(domain, { policy });
  }

  /**
   * Update TLS policy parameters
   */
  async updateTLSPolicyParameters(
    domain: string,
    parameters: Record<string, unknown>
  ): Promise<MailcowTLSPolicy> {
    return this.updateTLSPolicy(domain, { parameters });
  }

  /**
   * Get active TLS policies
   */
  async getActiveTLSPolicies(): Promise<MailcowTLSPolicy[]> {
    return this.listTLSPolicies({ active: true });
  }

  /**
   * Get inactive TLS policies
   */
  async getInactiveTLSPolicies(): Promise<MailcowTLSPolicy[]> {
    return this.listTLSPolicies({ active: false });
  }

  /**
   * Get TLS policies by policy type
   */
  async getTLSPoliciesByType(
    policy:
      | 'none'
      | 'may'
      | 'encrypt'
      | 'dane'
      | 'dane-only'
      | 'fingerprint'
      | 'verify'
      | 'secure'
  ): Promise<MailcowTLSPolicy[]> {
    return this.listTLSPolicies({ policy });
  }

  /**
   * Get TLS policies created after a specific date
   */
  async getTLSPoliciesCreatedAfter(date: Date): Promise<MailcowTLSPolicy[]> {
    return this.listTLSPolicies({ created_after: date });
  }

  /**
   * Get TLS policies created before a specific date
   */
  async getTLSPoliciesCreatedBefore(date: Date): Promise<MailcowTLSPolicy[]> {
    return this.listTLSPolicies({ created_before: date });
  }

  /**
   * Validate TLS policy configuration
   */
  validateTLSPolicy(policy: MailcowTLSPolicy): boolean {
    const validPolicies = [
      'none',
      'may',
      'encrypt',
      'dane',
      'dane-only',
      'fingerprint',
      'verify',
      'secure',
    ];

    return (
      policy.domain.length > 0 &&
      validPolicies.includes(policy.policy) &&
      typeof policy.active === 'boolean'
    );
  }

  /**
   * Get TLS policy description
   */
  getTLSPolicyDescription(policy: MailcowTLSPolicy): string {
    const descriptions: Record<string, string> = {
      none: 'No TLS enforcement',
      may: 'Opportunistic TLS',
      encrypt: 'Require TLS encryption',
      dane: 'DANE verification',
      'dane-only': 'DANE verification only',
      fingerprint: 'Certificate fingerprint verification',
      verify: 'Certificate verification',
      secure: 'Secure TLS configuration',
    };

    return descriptions[policy.policy] || 'Unknown policy type';
  }

  /**
   * Check if TLS policy is secure
   */
  isSecureTLSPolicy(policy: MailcowTLSPolicy): boolean {
    const securePolicies = [
      'encrypt',
      'dane',
      'dane-only',
      'fingerprint',
      'verify',
      'secure',
    ];
    return securePolicies.includes(policy.policy);
  }
} 