import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.users.uploadAvatar(file),
    onSuccess: (data) => {
      toast.success('Avatar uploaded successfully');
      queryClient.setQueryData(queryKeys.user.profile(), data);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload avatar');
    },
  });
};
