import { APIClient } from '../client';
import { 
  MailcowSyncJob, 
  ListSyncJobsParams, 
  CreateSyncJobRequest, 
  UpdateSyncJobRequest 
} from '../../types';
import { APIAction } from '../../types/api';
import { buildSyncJobEndpoint } from '../endpoints';

export class JobsAPI {
  constructor(private client: APIClient) {}

  async listSyncJobs(params?: ListSyncJobsParams): Promise<MailcowSyncJob[]> {
    return this.client.get<MailcowSyncJob[]>(
      buildSyncJobEndpoint(APIAction.LIST),
      { params }
    );
  }

  async createSyncJob(job: CreateSyncJobRequest): Promise<MailcowSyncJob> {
    return this.client.post<MailcowSyncJob>(
      buildSyncJobEndpoint(APIAction.CREATE),
      job
    );
  }

  async updateSyncJob(jobId: number, updates: UpdateSyncJobRequest): Promise<MailcowSyncJob> {
    const payload = { ...updates, id: jobId };
    return this.client.post<MailcowSyncJob>(
      buildSyncJobEndpoint(APIAction.UPDATE),
      payload
    );
  }

  async deleteSyncJob(jobId: number): Promise<void> {
    await this.client.post<void>(
      buildSyncJobEndpoint(APIAction.DELETE),
      { id: jobId }
    );
  }

  async getSyncJobDetails(jobId: number): Promise<MailcowSyncJob> {
    const jobs = await this.client.get<MailcowSyncJob[]>(
      buildSyncJobEndpoint(APIAction.GET)
    );
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      throw new Error(`Sync job not found: ${jobId}`);
    }
    return job;
  }

  async activateSyncJob(jobId: number): Promise<MailcowSyncJob> {
    return this.updateSyncJob(jobId, { active: true });
  }

  async deactivateSyncJob(jobId: number): Promise<MailcowSyncJob> {
    return this.updateSyncJob(jobId, { active: false });
  }
} 