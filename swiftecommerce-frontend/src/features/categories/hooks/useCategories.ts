import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  CategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/features/categories/types/categories.types.ts';
import { PaginatedResponse } from '@/shared/types/common.types.ts';

export function useCategories(
  storeId: string,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<CategoryDto>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.categories.list(storeId),
    queryFn: () => api.categories.getCategories(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCategory(
  storeId: string,
  categoryId: string,
  options?: Omit<UseQueryOptions<CategoryDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.categories.detail(storeId, categoryId),
    queryFn: () => api.categories.getCategory(storeId, categoryId),
    enabled: !!storeId && !!categoryId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCategoryTree(
  storeId: string,
  options?: Omit<UseQueryOptions<CategoryDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.categories.tree(storeId),
    queryFn: () => api.categories.getCategoryTree(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCategoryMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: (data: CreateCategoryDto) =>
      api.categories.createCategory(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.categories(storeId));
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
      api.categories.updateCategory(storeId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.detail(storeId, id),
      });
      queryClient.invalidateQueries(invalidateFeature.categories(storeId));
      toast.success('Category updated successfully');
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) =>
      api.categories.deleteCategory(storeId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.categories(storeId));
      toast.success('Category deleted successfully');
    },
    onError: () => toast.error('Failed to delete category'),
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
