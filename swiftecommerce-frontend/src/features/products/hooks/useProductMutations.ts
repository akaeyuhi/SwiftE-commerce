import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { Product } from '../types/product.types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const imagesToFormData = (data: any) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'images') {
      (value as File[]).forEach((file) => {
        formData.append('photos', file);
      });
    } else if (value !== undefined && value !== null) {
      formData.append(key, value as string);
    }
  });
  return formData;
};

export function useProductMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createProduct = useMutation({
    mutationFn: (data: Partial<Product> & { images?: File[] }) => {
      const formData = imagesToFormData(data);
      return api.products.createProduct(storeId, formData as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.products(storeId));
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Product> & { images?: File[] };
    }) => {
      const formData = imagesToFormData(data);
      return api.products.updateProduct(storeId, id, formData as any);
    },
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
