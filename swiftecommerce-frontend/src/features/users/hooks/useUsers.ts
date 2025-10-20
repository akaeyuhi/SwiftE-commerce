import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { User } from '@/shared/types/common.types';
import { api } from '@/lib/api';

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

export function useUser(
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.detail(userId),
    queryFn: () => api.users.getUser(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserStoreRoles(
  userId: string,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.roles(userId),
    queryFn: () => api.users.getStoreRoles(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
