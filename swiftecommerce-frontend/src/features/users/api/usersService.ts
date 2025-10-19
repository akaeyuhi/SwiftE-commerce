import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { User } from '@/shared/types/common.types';

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
}

export interface UserStoreRole {
  storeId: string;
  storeName: string;
  role: string;
  assignedAt: string;
}

export class UsersService extends BaseService {
  /**
   * Create user
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    return this.client.post<User>(API_ENDPOINTS.USERS.CREATE, data);
  }

  /**
   * Get all users
   */
  async getUsers(params?: { page?: number; limit?: number }): Promise<User[]> {
    const urlWithParams = this.buildQueryUrl(API_ENDPOINTS.USERS.LIST, params);
    return this.client.get<User[]>(urlWithParams);
  }

  /**
   * Get single user
   */
  async getUser(userId: string): Promise<User> {
    const url = buildUrl(API_ENDPOINTS.USERS.FIND_ONE, { id: userId });
    return this.client.get<User>(url);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const url = buildUrl(API_ENDPOINTS.USERS.UPDATE, { id: userId });
    return this.client.patch<User>(url, data);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.USERS.DELETE, { id: userId });
    return this.client.delete<void>(url);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.client.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    return this.client.put<User>(API_ENDPOINTS.USERS.UPDATE_PROFILE, data);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User> {
    const url = buildUrl(API_ENDPOINTS.USERS.GET_USER_PROFILE, { id: userId });
    return this.client.get<User>(url);
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string, token: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.USERS.VERIFY_EMAIL, { id: userId });
    return this.client.post<void>(url, { token });
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const url = buildUrl(API_ENDPOINTS.USERS.IS_EMAIL_VERIFIED, { id: userId });
    return this.client.get<boolean>(url);
  }

  /**
   * Check store role
   */
  async checkStoreRole(
    userId: string,
    storeId: string,
    roleName: string
  ): Promise<boolean> {
    const url = buildUrl(API_ENDPOINTS.USERS.CHECK_STORE_ROLE, {
      id: userId,
      storeId,
      roleName,
    });
    return this.client.get<boolean>(url);
  }

  /**
   * Check if user is store admin
   */
  async isStoreAdmin(userId: string, storeId: string): Promise<boolean> {
    const url = buildUrl(API_ENDPOINTS.USERS.IS_STORE_ADMIN, {
      id: userId,
      storeId,
    });
    return this.client.get<boolean>(url);
  }

  /**
   * Get user's store roles
   */
  async getStoreRoles(userId: string): Promise<UserStoreRole[]> {
    const url = buildUrl(API_ENDPOINTS.USERS.GET_STORE_ROLES, { id: userId });
    return this.client.get<UserStoreRole[]>(url);
  }

  /**
   * Check if user is site admin
   */
  async isSiteAdmin(userId: string): Promise<boolean> {
    const url = buildUrl(API_ENDPOINTS.USERS.IS_SITE_ADMIN, { id: userId });
    return this.client.get<boolean>(url);
  }

  /**
   * Assign site admin role
   */
  async assignSiteAdmin(userId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.USERS.ASSIGN_SITE_ADMIN, { id: userId });
    return this.client.post<void>(url);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<User> {
    const url = buildUrl(API_ENDPOINTS.USERS.DEACTIVATE, { id: userId });
    return this.client.post<User>(url);
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId: string): Promise<User> {
    const url = buildUrl(API_ENDPOINTS.USERS.REACTIVATE, { id: userId });
    return this.client.post<User>(url);
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    storeId: string,
    role: string
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.USERS.ASSIGN_ROLE, { id: userId });
    return this.client.post<void>(url, { storeId, role });
  }

  /**
   * Revoke store role
   */
  async revokeStoreRole(userId: string, storeId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.USERS.REVOKE_STORE_ROLE, { id: userId });
    return this.client.delete<void>(url, { data: { storeId } });
  }

  /**
   * Create store for user
   */
  async createStore(
    userId: string,
    data: { name: string; description?: string }
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.USERS.CREATE_STORE, { id: userId });
    return this.client.post(url, data);
  }
}

export const usersService = new UsersService();
