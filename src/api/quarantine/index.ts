/**
 * Quarantine API
 * Handles quarantined email management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowQuarantineItem, 
  ListQuarantineParams,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildQuarantineEndpoint } from '../endpoints';

/**
 * Quarantine API class for managing Mailcow quarantined items
 */
export class QuarantineAPI {
  constructor(private client: APIClient) {}

  /**
   * List all quarantined items with optional filtering
   */
  async listQuarantineItems(params?: ListQuarantineParams): Promise<MailcowQuarantineItem[]> {
    const response = await this.client.get<MailcowQuarantineItem[]>(
      buildQuarantineEndpoint('list'),
      { params }
    );
    return response;
  }

  /**
   * Get a specific quarantined item by ID
   */
  async getQuarantineItem(id: string): Promise<MailcowQuarantineItem | null> {
    const items = await this.listQuarantineItems();
    return items.find(item => item.id === id) || null;
  }

  /**
   * Get quarantined items by sender
   */
  async getQuarantineItemsBySender(sender: string): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ sender });
  }

  /**
   * Get quarantined items by recipient
   */
  async getQuarantineItemsByRecipient(recipient: string): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ recipient });
  }

  /**
   * Get quarantined items by subject
   */
  async getQuarantineItemsBySubject(subject: string): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ subject });
  }

  /**
   * Get quarantined items by reason
   */
  async getQuarantineItemsByReason(reason: string): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ reason });
  }

  /**
   * Release quarantined items
   */
  async releaseQuarantineItems(itemIds: string[]): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildQuarantineEndpoint('update'),
      {
        action: 'release',
        items: itemIds
      }
    );
    return response.success;
  }

  /**
   * Delete quarantined items
   */
  async deleteQuarantineItems(itemIds: string[]): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildQuarantineEndpoint('update'),
      {
        action: 'delete',
        items: itemIds
      }
    );
    return response.success;
  }

  /**
   * Whitelist sender of quarantined items
   */
  async whitelistQuarantineItems(itemIds: string[]): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildQuarantineEndpoint('update'),
      {
        action: 'whitelist',
        items: itemIds
      }
    );
    return response.success;
  }

  /**
   * Blacklist sender of quarantined items
   */
  async blacklistQuarantineItems(itemIds: string[]): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildQuarantineEndpoint('update'),
      {
        action: 'blacklist',
        items: itemIds
      }
    );
    return response.success;
  }

  /**
   * Release a single quarantined item
   */
  async releaseQuarantineItem(itemId: string): Promise<boolean> {
    return this.releaseQuarantineItems([itemId]);
  }

  /**
   * Delete a single quarantined item
   */
  async deleteQuarantineItem(itemId: string): Promise<boolean> {
    return this.deleteQuarantineItems([itemId]);
  }

  /**
   * Whitelist sender of a single quarantined item
   */
  async whitelistQuarantineItem(itemId: string): Promise<boolean> {
    return this.whitelistQuarantineItems([itemId]);
  }

  /**
   * Blacklist sender of a single quarantined item
   */
  async blacklistQuarantineItem(itemId: string): Promise<boolean> {
    return this.blacklistQuarantineItems([itemId]);
  }

  /**
   * Get quarantined items from a specific time range
   */
  async getQuarantineItemsInTimeRange(startTime: Date, endTime: Date): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ start_time: startTime, end_time: endTime });
  }

  /**
   * Get quarantined items from a specific sender in time range
   */
  async getQuarantineItemsBySenderInTimeRange(
    sender: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ 
      sender, 
      start_time: startTime, 
      end_time: endTime 
    });
  }

  /**
   * Get quarantined items for a specific recipient in time range
   */
  async getQuarantineItemsByRecipientInTimeRange(
    recipient: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<MailcowQuarantineItem[]> {
    return this.listQuarantineItems({ 
      recipient, 
      start_time: startTime, 
      end_time: endTime 
    });
  }

  /**
   * Get total size of quarantined items
   */
  async getQuarantineTotalSize(): Promise<number> {
    const items = await this.listQuarantineItems();
    return items.reduce((total, item) => total + item.size, 0);
  }

  /**
   * Get quarantine statistics
   */
  async getQuarantineStats(): Promise<{
    totalItems: number;
    totalSize: number;
    byReason: Record<string, number>;
    bySender: Record<string, number>;
  }> {
    const items = await this.listQuarantineItems();
    
    const byReason: Record<string, number> = {};
    const bySender: Record<string, number> = {};
    
    items.forEach(item => {
      byReason[item.reason] = (byReason[item.reason] || 0) + 1;
      bySender[item.sender] = (bySender[item.sender] || 0) + 1;
    });

    return {
      totalItems: items.length,
      totalSize: items.reduce((total, item) => total + item.size, 0),
      byReason,
      bySender
    };
  }
} 