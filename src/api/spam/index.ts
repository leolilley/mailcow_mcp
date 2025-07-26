import { APIClient } from '../client';
import { MailcowSpamSettings, UpdateSpamSettingsRequest } from '../../types';

export class SpamAPI {
  constructor(private client: APIClient) {}

  async getSpamSettings(): Promise<MailcowSpamSettings> {
    return this.client.get<MailcowSpamSettings>('/api/v1/get/spam/settings');
  }

  async updateSpamSettings(settings: UpdateSpamSettingsRequest): Promise<MailcowSpamSettings> {
    return this.client.post<MailcowSpamSettings>('/api/v1/edit/spam/settings', settings);
  }

  async addWhitelistEntry(entry: string): Promise<void> {
    const settings = await this.getSpamSettings();
    const updatedWhitelist = [...settings.whitelist, entry];
    await this.updateSpamSettings({ whitelist: updatedWhitelist });
  }

  async addBlacklistEntry(entry: string): Promise<void> {
    const settings = await this.getSpamSettings();
    const updatedBlacklist = [...settings.blacklist, entry];
    await this.updateSpamSettings({ blacklist: updatedBlacklist });
  }

  async removeWhitelistEntry(entry: string): Promise<void> {
    const settings = await this.getSpamSettings();
    const updatedWhitelist = settings.whitelist.filter(item => item !== entry);
    await this.updateSpamSettings({ whitelist: updatedWhitelist });
  }

  async removeBlacklistEntry(entry: string): Promise<void> {
    const settings = await this.getSpamSettings();
    const updatedBlacklist = settings.blacklist.filter(item => item !== entry);
    await this.updateSpamSettings({ blacklist: updatedBlacklist });
  }
} 