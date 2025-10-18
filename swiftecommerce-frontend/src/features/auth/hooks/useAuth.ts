import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi';
import type { LoginCredentials, RegisterData } from '../types/auth.types';
import {
  setAccessToken,
  clearTokens,
  getAccessToken,
} from '@/lib/auth/tokenManager';
import { useStore } from '@/app/store';
import { handleApiError } from '@/lib/api/errorHandler';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser, logout: logoutStore } = useStore();

  // Fetch user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: authApi.getProfile,
    retry: false,
    enabled: !!getAccessToken(),
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      queryClient.setQueryData(['auth', 'profile'], data.user);
      toast.success('Login successful!');
      navigate('/dashboard');
    },
    onError: handleApiError,
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterData) => authApi.register(userData),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      queryClient.setQueryData(['auth', 'profile'], data.user);
      toast.success('Registration successful!');
      navigate('/dashboard');
    },
    onError: handleApiError,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearTokens();
      logoutStore();
      queryClient.clear();
      navigate('/login');
      toast.success('Logged out successfully');
    },
    onError: handleApiError,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
