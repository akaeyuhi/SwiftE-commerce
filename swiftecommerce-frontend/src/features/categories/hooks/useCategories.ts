import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Category, CategoryTree } from '../types/categories.types';
import { api } from '@/lib/api';

export function useCategories(
  storeId: string,
  options?: Omit<UseQueryOptions<Category[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.categories.list(storeId),
    queryFn: () => api.categories.getCategories(storeId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useCategoryTree(
  storeId: string,
  options?: Omit<UseQueryOptions<CategoryTree[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.categories.tree(storeId),
    queryFn: () => api.categories.getCategoryTree(storeId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
