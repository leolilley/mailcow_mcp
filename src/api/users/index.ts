/**
 * Users API
 * Handles user management operations for Mailcow
 */

import { APIClient } from '../client';
import { 
  MailcowUser, 
  CreateUserRequest, 
  UpdateUserRequest, 
  ListUsersParams,
  MailcowAPIResponse 
} from '../../types/mailcow';
import { buildUserEndpoint } from '../endpoints';
import { APIAction } from '../../types/api';

/**
 * Users API class for managing Mailcow users
 */
export class UsersAPI {
  constructor(private client: APIClient) {}

  /**
   * List all users with optional filtering
   */
  async listUsers(params?: ListUsersParams): Promise<MailcowUser[]> {
    const response = await this.client.get<MailcowUser[]>(
      buildUserEndpoint(APIAction.LIST),
      { params }
    );
    return response;
  }

  /**
   * Get a specific user by username
   */
  async getUser(username: string): Promise<MailcowUser | null> {
    const users = await this.listUsers({ username });
    return users.find((user) => user.username === username) || null;
  }

  /**
   * Get users by domain
   */
  async getUsersByDomain(domain: string): Promise<MailcowUser[]> {
    return this.listUsers({ domain });
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<MailcowUser> {
    const response = await this.client.post<MailcowUser>(
      buildUserEndpoint(APIAction.CREATE),
      userData
    );
    return response;
  }

  /**
   * Update an existing user
   */
  async updateUser(
    username: string,
    userData: UpdateUserRequest
  ): Promise<MailcowUser> {
    const response = await this.client.post<MailcowUser>(
      buildUserEndpoint(APIAction.UPDATE),
      { username, ...userData }
    );
    return response;
  }

  /**
   * Delete a user
   */
  async deleteUser(username: string): Promise<boolean> {
    const response = await this.client.post<MailcowAPIResponse>(
      buildUserEndpoint(APIAction.DELETE),
      { username }
    );
    return response.success;
  }

  /**
   * Activate a user
   */
  async activateUser(username: string): Promise<MailcowUser> {
    return this.updateUser(username, { active: true });
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(username: string): Promise<MailcowUser> {
    return this.updateUser(username, { active: false });
  }

  /**
   * Update user quota
   */
  async updateUserQuota(username: string, quota: number): Promise<MailcowUser> {
    return this.updateUser(username, { quota });
  }

  /**
   * Change user password
   */
  async changeUserPassword(
    username: string,
    password: string
  ): Promise<MailcowUser> {
    return this.updateUser(username, { password });
  }

  /**
   * Get active users
   */
  async getActiveUsers(): Promise<MailcowUser[]> {
    return this.listUsers({ active: true });
  }

  /**
   * Get inactive users
   */
  async getInactiveUsers(): Promise<MailcowUser[]> {
    return this.listUsers({ active: false });
  }

  /**
   * Get users created after a specific date
   */
  async getUsersCreatedAfter(date: Date): Promise<MailcowUser[]> {
    return this.listUsers({ created_after: date });
  }

  /**
   * Get users created before a specific date
   */
  async getUsersCreatedBefore(date: Date): Promise<MailcowUser[]> {
    return this.listUsers({ created_before: date });
  }
} 