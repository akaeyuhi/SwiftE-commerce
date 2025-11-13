import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';

export const useUploadStoreFiles = (storeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: { logo?: File; banner?: File }) =>
      api.stores.uploadStoreFiles(storeId, files),
    onSuccess: (data) => {
      toast.success('Store files uploaded successfully');
      queryClient.setQueryData(queryKeys.stores.detail(storeId), data);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload store files');
    },
  });
};
