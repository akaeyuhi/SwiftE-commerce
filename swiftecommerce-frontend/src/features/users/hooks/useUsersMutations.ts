import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { UpdateProfileDto } from '@/features/users/types/users.types.ts';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useUserMutations() {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: (data: UpdateProfileDto) => api.users.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const deactivateUser = useMutation({
    mutationFn: (userId: string) => api.users.deactivateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.detail(userId),
      });
      toast.success('User deactivated successfully');
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const reactivateUser = useMutation({
    mutationFn: (userId: string) => api.users.reactivateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.detail(userId),
      });
      toast.success('User reactivated successfully');
    },
    onError: () => toast.error('Failed to reactivate user'),
  });

  const assignStoreRole = useMutation({
    mutationFn: ({
      userId,
      roleData,
    }: {
      userId: string;
      roleData: { storeId: string; roleName: string };
    }) =>
      api.users.assignStoreRole(userId, roleData.storeId, roleData.roleName),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.roles(userId) });
      toast.success('Role assigned successfully');
    },
    onError: () => toast.error('Failed to assign role'),
  });

  const revokeStoreRole = useMutation({
    mutationFn: ({ userId, storeId }: { userId: string; storeId: string }) =>
      api.users.revokeStoreRole(userId, storeId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.roles(userId) });
      toast.success('Role revoked successfully');
    },
    onError: () => toast.error('Failed to revoke role'),
  });

  const assignSiteAdmin = useMutation({
    mutationFn: (userId: string) => api.users.assignSiteAdmin(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.detail(userId),
      });
      toast.success('Site admin assigned successfully');
    },
    onError: () => toast.error('Failed to assign site admin'),
  });

  const revokeSiteAdmin = useMutation({
    mutationFn: (userId: string) => api.users.revokeSiteAdmin(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.detail(userId),
      });
      toast.success('Site admin revoked successfully');
    },
    onError: () => toast.error('Failed to revoke site admin'),
  });

  const markEmailVerified = useMutation({
    mutationFn: ({ userId, token }: { userId: string; token: string }) =>
      api.users.verifyEmail(userId, token),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.detail(dto.userId),
      });
      toast.success('Email verified successfully');
    },
    onError: () => toast.error('Failed to verify email'),
  });

  return {
    updateProfile,
    deactivateUser,
    reactivateUser,
    assignStoreRole,
    revokeStoreRole,
    assignSiteAdmin,
    revokeSiteAdmin,
    markEmailVerified,
  };
}
