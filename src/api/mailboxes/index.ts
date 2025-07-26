import { APIClient } from '../client';
import { MailcowMailbox, ListMailboxesParams, CreateMailboxRequest, UpdateMailboxRequest } from '../../types';

export class MailboxAPI {
  constructor(private client: APIClient) {}

  async listMailboxes(params?: ListMailboxesParams): Promise<MailcowMailbox[]> {
    return this.client.get<MailcowMailbox[]>('/api/v1/get/mailbox', params as Record<string, unknown>);
  }

  async createMailbox(mailbox: CreateMailboxRequest): Promise<MailcowMailbox> {
    return this.client.post<MailcowMailbox>('/api/v1/add/mailbox', mailbox);
  }

  async updateMailbox(mailboxId: string, updates: UpdateMailboxRequest): Promise<MailcowMailbox> {
    const payload = { ...updates, mailbox: mailboxId };
    return this.client.post<MailcowMailbox>('/api/v1/edit/mailbox', payload);
  }

  async deleteMailbox(mailboxId: string): Promise<void> {
    await this.client.post<void>('/api/v1/delete/mailbox', { mailbox: mailboxId });
  }

  async getMailboxDetails(mailboxId: string): Promise<MailcowMailbox> {
    const mailboxes = await this.client.get<MailcowMailbox[]>('/api/v1/get/mailbox');
    const mailbox = mailboxes.find(m => m.username === mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox not found: ${mailboxId}`);
    }
    return mailbox;
  }

  async setMailboxQuota(mailboxId: string, quota: number): Promise<MailcowMailbox> {
    return this.updateMailbox(mailboxId, { quota });
  }
} 