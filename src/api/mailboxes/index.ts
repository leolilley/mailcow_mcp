import { APIClient } from '../client';
import {
  MailcowMailbox,
  ListMailboxesParams,
  CreateMailboxRequest,
  UpdateMailboxRequest,
  APIAction,
} from '../../types';
import { buildMailboxEndpoint } from '../endpoints';

export class MailboxAPI {
  constructor(private client: APIClient) {}

  async listMailboxes(params?: ListMailboxesParams): Promise<MailcowMailbox[]> {
    return this.client.get<MailcowMailbox[]>(
      buildMailboxEndpoint(APIAction.LIST),
      { params }
    );
  }

  async createMailbox(mailbox: CreateMailboxRequest): Promise<MailcowMailbox> {
    return this.client.post<MailcowMailbox>(
      buildMailboxEndpoint(APIAction.CREATE),
      mailbox
    );
  }

  async updateMailbox(mailboxId: string, updates: UpdateMailboxRequest): Promise<MailcowMailbox> {
    const payload = { ...updates, mailbox: mailboxId };
    return this.client.post<MailcowMailbox>(
      buildMailboxEndpoint(APIAction.UPDATE),
      payload
    );
  }

  async deleteMailbox(mailboxId: string): Promise<void> {
    await this.client.post<void>(buildMailboxEndpoint(APIAction.DELETE), {
      mailbox: mailboxId,
    });
  }

  async getMailboxDetails(mailboxId: string): Promise<MailcowMailbox> {
    const mailboxes = await this.client.get<MailcowMailbox[]>(
      buildMailboxEndpoint(APIAction.GET)
    );
    const mailbox = mailboxes.find((m) => m.username === mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox not found: ${mailboxId}`);
    }
    return mailbox;
  }

  async setMailboxQuota(mailboxId: string, quota: number): Promise<MailcowMailbox> {
    return this.updateMailbox(mailboxId, { quota });
  }
} 