import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { Product } from '../types/product.types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useProductMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createProduct = useMutation({
    mutationFn: (data: Partial<Product>) =>
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
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

  return { createProduct, updateProduct, deleteProduct };
}
