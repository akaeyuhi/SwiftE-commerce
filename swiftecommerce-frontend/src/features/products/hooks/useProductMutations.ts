import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  CreateProductDto,
  UpdateProductDto,
} from '@/features/products/types/dto.types.ts';

export function useProductMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createProduct = useMutation({
    mutationFn: (data: CreateProductDto) =>
      api.products.createProduct(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.products(storeId));
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      api.products.updateProduct(storeId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(storeId, id),
      });
      queryClient.invalidateQueries(invalidateFeature.products(storeId));
      toast.success('Product updated successfully');
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteProduct = useMutation({
    mutationFn: (productId: string) =>
      api.products.deleteProduct(storeId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.products(storeId));
      toast.success('Product deleted successfully');
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const uploadPhotos = useMutation({
    mutationFn: ({ productId, files }: { productId: string; files: File[] }) =>
      api.products.uploadPhotos(storeId, productId, files),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(storeId, productId),
      });
      toast.success('Photos uploaded successfully');
    },
    onError: () => toast.error('Failed to upload photos'),
  });

  const deletePhoto = useMutation({
    mutationFn: ({
      productId,
      photoId,
    }: {
      productId: string;
      photoId: string;
    }) => api.products.deletePhoto(storeId, productId, photoId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(storeId, productId),
      });
      toast.success('Photo deleted successfully');
    },
    onError: () => toast.error('Failed to delete photo'),
  });

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    uploadPhotos,
    deletePhoto,
  };
}
