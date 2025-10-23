import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  CreateStoreDto,
  UpdateStoreDto,
} from '@/features/stores/types/store.types.ts';

export function useStoreMutations() {
  const queryClient = useQueryClient();

  const createStore = useMutation({
    mutationFn: (data: CreateStoreDto) => api.stores.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.stores());
      toast.success('Store created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create store');
    },
  });

  const updateStore = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreDto }) =>
      api.stores.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(id) });
      queryClient.invalidateQueries(invalidateFeature.stores());
      toast.success('Store updated successfully');
    },
    onError: () => toast.error('Failed to update store'),
  });

  const deleteStore = useMutation({
    mutationFn: (storeId: string) => api.stores.delete(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.stores());
      toast.success('Store deleted successfully');
    },
    onError: () => toast.error('Failed to delete store'),
  });

  const softDeleteStore = useMutation({
    mutationFn: (storeId: string) => api.stores.softDelete(storeId),
    onSuccess: (_, storeId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stores.detail(storeId),
      });
      queryClient.invalidateQueries(invalidateFeature.stores());
      toast.success('Store archived successfully');
    },
    onError: () => toast.error('Failed to archive store'),
  });

  const recalculateStats = useMutation({
    mutationFn: (storeId: string) => api.stores.recalculateStats(storeId),
    onSuccess: (_, storeId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stores.stats(storeId),
      });
      toast.success('Stats recalculated successfully');
    },
    onError: () => toast.error('Failed to recalculate stats'),
  });

  const recalculateAllStats = useMutation({
    mutationFn: () => api.stores.recalculateAllStats(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
      toast.success('All store stats recalculated successfully');
    },
    onError: () => toast.error('Failed to recalculate all stats'),
  });

  return {
    createStore,
    updateStore,
    deleteStore,
    softDeleteStore,
    recalculateStats,
    recalculateAllStats,
  };
}
