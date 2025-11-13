import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import {
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto,
} from '@/features/news/types/news.types';
import { toast } from 'sonner';
import { api, PaginatedResponse } from '@/lib/api';

export function useNews(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<NewsPost>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.news.list(storeId, params),
    queryFn: () => api.news.getNews(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useNewsPost(
  storeId: string,
  postId: string,
  options?: Omit<UseQueryOptions<NewsPost>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.news.detail(storeId, postId),
    queryFn: () => api.news.getNewsPost(storeId, postId),
    enabled: !!storeId && !!postId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useStoreNews(
  storeId: string,
  options?: Omit<UseQueryOptions<NewsPost[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.news.list(storeId), 'store-all'],
    queryFn: () => api.news.getAllStoreNews(storeId),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useNewsMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: (data: CreateNewsDto) =>
      api.news.createNewsWithRelations(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.news(storeId));
      toast.success('News post created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create news post');
    },
  });

  const updatePost = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNewsDto }) =>
      api.news.updateNews(storeId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.news.detail(storeId, id),
      });
      queryClient.invalidateQueries(invalidateFeature.news(storeId));
      toast.success('News post updated successfully');
    },
    onError: () => toast.error('Failed to update news post'),
  });

  const deletePost = useMutation({
    mutationFn: (postId: string) => api.news.deleteNews(storeId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.news(storeId));
      toast.success('News post deleted successfully');
    },
    onError: () => toast.error('Failed to delete news post'),
  });

  const publishPost = useMutation({
    mutationFn: (postId: string) => api.news.publishNews(storeId, postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.news.detail(storeId, postId),
      });
      queryClient.invalidateQueries(invalidateFeature.news(storeId));
      toast.success('News post published successfully');
    },
    onError: () => toast.error('Failed to publish news post'),
  });

  const unpublishPost = useMutation({
    mutationFn: (postId: string) => api.news.unpublishNews(storeId, postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.news.detail(storeId, postId),
      });
      queryClient.invalidateQueries(invalidateFeature.news(storeId));
      toast.success('News post unpublished successfully');
    },
    onError: () => toast.error('Failed to unpublish news post'),
  });

  return {
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
  };
}
