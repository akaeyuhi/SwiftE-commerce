import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyTokenDto,
} from '@/features/auth/types/auth.types.ts';

export function useAuthMutations() {
  const queryClient = useQueryClient();

  const register = useMutation({
    mutationFn: (data: RegisterDto) => api.auth.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.profile(), data.user);
      toast.success('Registration successful');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const login = useMutation({
    mutationFn: (data: LoginDto) => api.auth.login(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.profile(), data.user);
      toast.success('Login successful');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed');
    },
  });

  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast.success('Logged out successfully');
    },
    onError: () => {
      toast.error('Logout failed');
    },
  });

  const refreshToken = useMutation({
    mutationFn: (data?: RefreshTokenDto) => api.auth.refreshToken(data),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.profile(), data.user);
    },
    onError: () => {
      queryClient.clear();
      toast.error('Session expired, please login again');
    },
  });

  const resetPassword = useMutation({
    mutationFn: (data: ResetPasswordDto) => api.auth.resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: ChangePasswordDto) => api.auth.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  const verifyToken = useMutation({
    mutationFn: (data: VerifyTokenDto) => api.auth.verifyToken(data),
    onError: (error: any) => {
      toast.error(error.message || 'Token verification failed');
    },
  });

  const resendVerification = useMutation({
    mutationFn: (email: string) => api.auth.resendConfirmation(email),
    onSuccess: () => {
      toast.success('Verification email sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send verification email');
    },
  });

  return {
    register,
    login,
    logout,
    refreshToken,
    resetPassword,
    changePassword,
    verifyToken,
    resendVerification,
  };
}
