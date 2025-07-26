// Reminder: If you see a linter error for 'process', run: npm i --save-dev @types/node
import { AuthResult, AccessLevel, AuthErrorCode } from '../types';

const IP_WHITELIST = process.env.MAILCOW_API_IP_WHITELIST ? process.env.MAILCOW_API_IP_WHITELIST.split(',') : [];

export class APIKeyManager {
  async loadAPIKey(): Promise<string> {
    // Load from environment variable
    const key = process.env.MAILCOW_API_KEY;
    if (!key) throw new Error('API key not found in environment variables');
    return key;
  }

  async validateAPIKey(key: string, clientIp?: string): Promise<AuthResult> {
    // Validate format
    if (typeof key !== 'string' || key.length < 32) {
      return { success: false, authenticated: false, error: { code: AuthErrorCode.INVALID_API_KEY, message: 'Invalid API key format' } };
    }
    // Check expiration (stub)
    // const expires = ...; if (expires && expires < new Date()) { ... }
    // Check IP whitelist
    if (IP_WHITELIST.length && clientIp && !IP_WHITELIST.includes(clientIp)) {
      return { success: false, authenticated: false, error: { code: AuthErrorCode.IP_NOT_ALLOWED, message: 'IP not allowed' } };
    }
    // TODO: Check permissions (stub)
    // TODO: Integrate with Mailcow API for real validation
    return { success: true, authenticated: true };
  }

  async testAPIKeyWithMailcow(key: string): Promise<{ success: boolean; accessLevel?: AccessLevel; error?: string } > {
    // TODO: Implement actual Mailcow API test
    console.log('Testing API key:', key);
    return { success: true, accessLevel: 'read-write' };
  }

  async rotateAPIKey(oldKey: string, newKey: string): Promise<boolean> {
    // TODO: Implement key rotation logic (update env/secure storage)
    console.log('Rotating API key:', oldKey, 'to', newKey);
    return true;
  }

  async storeAPIKeySecurely(key: string): Promise<void> {
    // TODO: Implement secure storage (e.g., encrypted file, vault)
    console.log('Storing API key securely:', key);
  }
} 