import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../types/auth.types';
import { User } from '@/shared/types/common.types';

export class AuthService extends BaseService {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH, {});
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.client.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const url = this.buildUrl(API_ENDPOINTS.USERS.UPDATE, { id: userId });
    return this.client.patch<User>(url, data);
  }

  // ... existing AuthService class ...

  /**
   * Confirm email/role
   */
  async confirm(type: 'email' | 'role', token: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.AUTH.CONFIRM, { type });
    return this.client.post<void>(url, { token });
  }

  /**
   * Resend confirmation
   */
  async resendConfirmation(email: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.RESEND_CONFIRMATION, {
      email,
    });
  }

  /**
   * Get confirmation status
   */
  async getConfirmationStatus(userId: string): Promise<{
    emailConfirmed: boolean;
    roleConfirmed: boolean;
  }> {
    const url = buildUrl(API_ENDPOINTS.AUTH.CONFIRMATION_STATUS, { userId });
    return this.client.get(url);
  }

  /**
   * Assign site admin
   */
  async assignSiteAdmin(userId: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.ASSIGN_SITE_ADMIN, {
      userId,
    });
  }

  /**
   * Assign store role
   */
  async assignStoreRole(
    userId: string,
    storeId: string,
    role: string
  ): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.ASSIGN_STORE_ROLE, {
      userId,
      storeId,
      role,
    });
  }

  /**
   * Revoke site admin
   */
  async revokeSiteAdmin(userId: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.REVOKE_SITE_ADMIN, {
      userId,
    });
  }

  /**
   * Revoke store role
   */
  async revokeStoreRole(userId: string, storeId: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.REVOKE_STORE_ROLE, {
      userId,
      storeId,
    });
  }

  /**
   * Cancel role assignment
   */
  async cancelRoleAssignment(assignmentId: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.AUTH.CANCEL_ROLE_ASSIGNMENT, {
      assignmentId,
    });
  }
}

export const authService = new AuthService();
