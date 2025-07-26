/**
 * Rspamd API
 * Handles Rspamd settings management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowRspamdSettings, 
  UpdateRspamdSettingsRequest
} from '../../types/mailcow';
import { buildRspamdEndpoint } from '../endpoints';

/**
 * Rspamd API class for managing Mailcow Rspamd settings
 */
export class RspamdAPI {
  constructor(private client: APIClient) {}

  /**
   * Get current Rspamd settings
   */
  async getRspamdSettings(): Promise<MailcowRspamdSettings> {
    const response = await this.client.get<MailcowRspamdSettings>(
      buildRspamdEndpoint('get')
    );
    return response;
  }

  /**
   * Update Rspamd settings
   */
  async updateRspamdSettings(settings: UpdateRspamdSettingsRequest): Promise<MailcowRspamdSettings> {
    const response = await this.client.post<MailcowRspamdSettings>(
      buildRspamdEndpoint('update'),
      settings
    );
    return response;
  }

  /**
   * Enable Rspamd
   */
  async enableRspamd(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ enabled: true });
  }

  /**
   * Disable Rspamd
   */
  async disableRspamd(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ enabled: false });
  }

  /**
   * Update Rspamd score threshold
   */
  async updateRspamdScoreThreshold(threshold: number): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ score_threshold: threshold });
  }

  /**
   * Add sender to Rspamd whitelist
   */
  async addToRspamdWhitelist(sender: string): Promise<MailcowRspamdSettings> {
    const currentSettings = await this.getRspamdSettings();
    const newWhitelist = [...currentSettings.whitelist, sender];
    return this.updateRspamdSettings({ whitelist: newWhitelist });
  }

  /**
   * Remove sender from Rspamd whitelist
   */
  async removeFromRspamdWhitelist(sender: string): Promise<MailcowRspamdSettings> {
    const currentSettings = await this.getRspamdSettings();
    const newWhitelist = currentSettings.whitelist.filter(s => s !== sender);
    return this.updateRspamdSettings({ whitelist: newWhitelist });
  }

  /**
   * Add sender to Rspamd blacklist
   */
  async addToRspamdBlacklist(sender: string): Promise<MailcowRspamdSettings> {
    const currentSettings = await this.getRspamdSettings();
    const newBlacklist = [...currentSettings.blacklist, sender];
    return this.updateRspamdSettings({ blacklist: newBlacklist });
  }

  /**
   * Remove sender from Rspamd blacklist
   */
  async removeFromRspamdBlacklist(sender: string): Promise<MailcowRspamdSettings> {
    const currentSettings = await this.getRspamdSettings();
    const newBlacklist = currentSettings.blacklist.filter(s => s !== sender);
    return this.updateRspamdSettings({ blacklist: newBlacklist });
  }

  /**
   * Enable Rspamd greylist
   */
  async enableRspamdGreylist(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ greylist_enabled: true });
  }

  /**
   * Disable Rspamd greylist
   */
  async disableRspamdGreylist(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ greylist_enabled: false });
  }

  /**
   * Enable Rspamd Bayes learning
   */
  async enableRspamdBayes(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ bayes_enabled: true });
  }

  /**
   * Disable Rspamd Bayes learning
   */
  async disableRspamdBayes(): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ bayes_enabled: false });
  }

  /**
   * Update Rspamd custom settings
   */
  async updateRspamdCustomSettings(settings: Record<string, unknown>): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ settings });
  }

  /**
   * Get Rspamd whitelist
   */
  async getRspamdWhitelist(): Promise<string[]> {
    const settings = await this.getRspamdSettings();
    return settings.whitelist;
  }

  /**
   * Get Rspamd blacklist
   */
  async getRspamdBlacklist(): Promise<string[]> {
    const settings = await this.getRspamdSettings();
    return settings.blacklist;
  }

  /**
   * Check if sender is whitelisted
   */
  async isSenderWhitelisted(sender: string): Promise<boolean> {
    const whitelist = await this.getRspamdWhitelist();
    return whitelist.includes(sender);
  }

  /**
   * Check if sender is blacklisted
   */
  async isSenderBlacklisted(sender: string): Promise<boolean> {
    const blacklist = await this.getRspamdBlacklist();
    return blacklist.includes(sender);
  }

  /**
   * Bulk update Rspamd whitelist
   */
  async updateRspamdWhitelist(senders: string[]): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ whitelist: senders });
  }

  /**
   * Bulk update Rspamd blacklist
   */
  async updateRspamdBlacklist(senders: string[]): Promise<MailcowRspamdSettings> {
    return this.updateRspamdSettings({ blacklist: senders });
  }

  /**
   * Validate Rspamd settings
   */
  validateRspamdSettings(settings: MailcowRspamdSettings): boolean {
    return (
      typeof settings.enabled === 'boolean' &&
      typeof settings.score_threshold === 'number' &&
      settings.score_threshold >= 0 &&
      Array.isArray(settings.whitelist) &&
      Array.isArray(settings.blacklist) &&
      typeof settings.greylist_enabled === 'boolean' &&
      typeof settings.bayes_enabled === 'boolean' &&
      typeof settings.settings === 'object'
    );
  }

  /**
   * Get Rspamd status summary
   */
  async getRspamdStatus(): Promise<{
    enabled: boolean;
    scoreThreshold: number;
    whitelistCount: number;
    blacklistCount: number;
    greylistEnabled: boolean;
    bayesEnabled: boolean;
  }> {
    const settings = await this.getRspamdSettings();
    
    return {
      enabled: settings.enabled,
      scoreThreshold: settings.score_threshold,
      whitelistCount: settings.whitelist.length,
      blacklistCount: settings.blacklist.length,
      greylistEnabled: settings.greylist_enabled,
      bayesEnabled: settings.bayes_enabled
    };
  }
} 