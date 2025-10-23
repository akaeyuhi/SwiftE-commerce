import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  AuthResponse,
  ChangePasswordDto,
  LoginDto, RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyTokenDto,
} from '@/features/auth/types/auth.types.ts';
import { User, UserDto } from '@/features/users/types/users.types';

export class AuthService extends BaseService {
  /**
   * Login user
   */
  async login(credentials: LoginDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
  }

  /**
   * Register new user
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto?: RefreshTokenDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      refreshTokenDto
    );
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

  async resetPassword(
    data: ResetPasswordDto
  ): Promise<{ success: boolean; message: string }> {
    const url = API_ENDPOINTS.AUTH.RESET_PASSWORD;
    return this.client.post<{ success: boolean; message: string }>(url, data);
  }

  async changePassword(data: ChangePasswordDto): Promise<{ success: boolean }> {
    const url = API_ENDPOINTS.AUTH.CHANGE_PASSWORD;
    return this.client.post<{ success: boolean }>(url, data);
  }

  async verifyToken(
    data: VerifyTokenDto
  ): Promise<{ valid: boolean; user?: UserDto }> {
    const url = API_ENDPOINTS.AUTH.VERIFY_TOKEN;
    return this.client.post<{ valid: boolean; user?: UserDto }>(url, data);
  }
}

export const authService = new AuthService();
