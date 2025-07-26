import { APIClient } from '../client';
import { 
  MailcowQueueItem, 
  ListQueueParams, 
  QueueAction 
} from '../../types';

export class QueuesAPI {
  constructor(private client: APIClient) {}

  async listQueueItems(params?: ListQueueParams): Promise<MailcowQueueItem[]> {
    return this.client.get<MailcowQueueItem[]>('/api/v1/get/queue', params as Record<string, unknown>);
  }

  async flushQueue(): Promise<void> {
    await this.client.post<void>('/api/v1/edit/queue/flush', {});
  }

  async deleteQueueItems(itemIds: string[]): Promise<void> {
    await this.client.post<void>('/api/v1/delete/queue', { items: itemIds });
  }

  async getQueueItemDetails(itemId: string): Promise<MailcowQueueItem> {
    const items = await this.client.get<MailcowQueueItem[]>('/api/v1/get/queue');
    const item = items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Queue item not found: ${itemId}`);
    }
    return item;
  }

  async retryQueueItem(itemId: string): Promise<void> {
    // This would typically be handled by the queue system
    // For now, we'll delete and potentially recreate the item
    await this.deleteQueueItems([itemId]);
  }

  async holdQueueItem(itemId: string): Promise<void> {
    // This would require a specific endpoint for holding items
    // For now, we'll use the general update mechanism
    await this.client.post<void>('/api/v1/edit/queue', { 
      action: 'hold', 
      items: [itemId] 
    });
  }

  async releaseQueueItem(itemId: string): Promise<void> {
    // This would require a specific endpoint for releasing items
    await this.client.post<void>('/api/v1/edit/queue', { 
      action: 'release', 
      items: [itemId] 
    });
  }
} 