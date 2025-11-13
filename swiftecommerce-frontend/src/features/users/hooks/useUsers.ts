import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import { User, UserStats } from '@/features/users/types/users.types.ts';
import { StoreRole } from '@/features/stores/types/store.types.ts';

export function useUserProfile(
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => api.users.getProfile(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserProfileStats(
  options?: Omit<UseQueryOptions<UserStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.profileStats(),
    queryFn: () => api.users.getProfileStats(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUser(
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.detail(userId),
    queryFn: () => api.users.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserStoreRoles(
  userId: string,
  options?: Omit<UseQueryOptions<StoreRole[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.roles(userId),
    queryFn: () => api.users.getStoreRoles(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserEmailVerified(
  userId: string,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.user.detail(userId), 'email-verified'],
    queryFn: () => api.users.isEmailVerified(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useUserHasStoreRole(
  userId: string,
  storeId: string,
  roleName: string,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.user.detail(userId), 'role', storeId, roleName],
    queryFn: () => api.users.isStoreAdmin(userId, storeId),
    enabled: !!userId && !!storeId && !!roleName,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserIsStoreAdmin(
  userId: string,
  storeId: string,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.user.detail(userId), 'store-admin', storeId],
    queryFn: () => api.users.isStoreAdmin(userId, storeId),
    enabled: !!userId && !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserIsSiteAdmin(
  userId: string,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.user.detail(userId), 'site-admin'],
    queryFn: () => api.users.isSiteAdmin(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
