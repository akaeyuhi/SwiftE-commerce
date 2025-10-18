import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/config/api.config';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../types/auth.types';
import { User } from '@/shared/types/common.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<User>(API_ENDPOINTS.USERS.PROFILE);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
};
