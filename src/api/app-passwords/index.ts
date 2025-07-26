/**
 * App Passwords API
 * Handles application password management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowAppPassword, 
  CreateAppPasswordRequest, 
  ListAppPasswordsParams,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildAppPasswdEndpoint } from '../endpoints';

/**
 * App Passwords API class for managing Mailcow application passwords
 */
export class AppPasswordsAPI {
  constructor(private client: APIClient) {}

  /**
   * List all app passwords with optional filtering
   */
  async listAppPasswords(params?: ListAppPasswordsParams): Promise<MailcowAppPassword[]> {
    const response = await this.client.get<MailcowAppPassword[]>(
      buildAppPasswdEndpoint('list'),
      { params }
    );
    return response;
  }

  /**
   * Get app passwords for a specific user
   */
  async getAppPasswordsByUser(username: string): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ username });
  }

  /**
   * Get app passwords by app name
   */
  async getAppPasswordsByApp(appName: string): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ app_name: appName });
  }

  /**
   * Get a specific app password by ID
   */
  async getAppPassword(id: number): Promise<MailcowAppPassword | null> {
    const passwords = await this.listAppPasswords();
    return passwords.find(password => password.id === id) || null;
  }

  /**
   * Get app password by username and app name
   */
  async getAppPasswordByUserAndApp(username: string, appName: string): Promise<MailcowAppPassword | null> {
    const passwords = await this.listAppPasswords({ username, app_name: appName });
    return passwords.find(password => 
      password.username === username && password.app_name === appName
    ) || null;
  }

  /**
   * Create a new app password
   */
  async createAppPassword(passwordData: CreateAppPasswordRequest): Promise<MailcowAppPassword> {
    const response = await this.client.post<MailcowAppPassword>(
      buildAppPasswdEndpoint('create'),
      passwordData
    );
    return response;
  }

  /**
   * Delete an app password
   */
  async deleteAppPassword(id: number): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildAppPasswdEndpoint('delete'),
      { id }
    );
    return response.success;
  }

  /**
   * Delete app password by username and app name
   */
  async deleteAppPasswordByUserAndApp(username: string, appName: string): Promise<boolean> {
    const password = await this.getAppPasswordByUserAndApp(username, appName);
    if (!password) {
      return false;
    }
    return this.deleteAppPassword(password.id);
  }

  /**
   * Get active app passwords
   */
  async getActiveAppPasswords(): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ active: true });
  }

  /**
   * Get inactive app passwords
   */
  async getInactiveAppPasswords(): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ active: false });
  }

  /**
   * Get app passwords created after a specific date
   */
  async getAppPasswordsCreatedAfter(date: Date): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ created_after: date });
  }

  /**
   * Get app passwords created before a specific date
   */
  async getAppPasswordsCreatedBefore(date: Date): Promise<MailcowAppPassword[]> {
    return this.listAppPasswords({ created_before: date });
  }

  /**
   * Get app passwords that haven't been used recently
   */
  async getUnusedAppPasswords(daysThreshold: number = 30): Promise<MailcowAppPassword[]> {
    const passwords = await this.listAppPasswords();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    
    return passwords.filter(password => {
      if (!password.last_used) {
        return password.created < thresholdDate;
      }
      return password.last_used < thresholdDate;
    });
  }

  /**
   * Get app passwords statistics
   */
  async getAppPasswordsStats(): Promise<{
    totalPasswords: number;
    activePasswords: number;
    inactivePasswords: number;
    byUser: Record<string, number>;
    byApp: Record<string, number>;
  }> {
    const passwords = await this.listAppPasswords();
    
    const byUser: Record<string, number> = {};
    const byApp: Record<string, number> = {};
    
    passwords.forEach(password => {
      byUser[password.username] = (byUser[password.username] || 0) + 1;
      byApp[password.app_name] = (byApp[password.app_name] || 0) + 1;
    });

    return {
      totalPasswords: passwords.length,
      activePasswords: passwords.filter(p => p.active).length,
      inactivePasswords: passwords.filter(p => !p.active).length,
      byUser,
      byApp
    };
  }

  /**
   * Validate app password configuration
   */
  validateAppPassword(password: MailcowAppPassword): boolean {
    return (
      password.username.length > 0 &&
      password.app_name.length > 0 &&
      password.password_hash.length > 0 &&
      typeof password.active === 'boolean'
    );
  }

  /**
   * Check if app password is expired (unused for too long)
   */
  isAppPasswordExpired(password: MailcowAppPassword, maxDays: number = 90): boolean {
    const lastUsed = password.last_used || password.created;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - maxDays);
    
    return lastUsed < expiryDate;
  }

  /**
   * Get app password age in days
   */
  getAppPasswordAge(password: MailcowAppPassword): number {
    const now = new Date();
    const created = password.created;
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 