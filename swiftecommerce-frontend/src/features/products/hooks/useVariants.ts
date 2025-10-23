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
  CreateVariantDto,
  UpdateVariantDto,
  SetInventoryDto,
  AdjustInventoryDto,
  UpdatePriceDto,
  AddAttributesDto,
  ProductVariant,
} from '@/features/products/types/variant.types';

export function useVariants(
  storeId: string,
  productId: string,
  options?: Omit<UseQueryOptions<ProductVariant[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.variants.list(storeId, productId),
    queryFn: () => api.variants.getVariants(storeId, productId),
    enabled: !!storeId && !!productId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useVariant(
  storeId: string,
  productId: string,
  variantId: string,
  options?: Omit<UseQueryOptions<ProductVariant>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.variants.detail(storeId, productId, variantId),
    queryFn: () => api.variants.getVariant(storeId, productId, variantId),
    enabled: !!storeId && !!productId && !!variantId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useVariantBySku(
  storeId: string,
  productId: string,
  sku: string,
  options?: Omit<UseQueryOptions<ProductVariant>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.variants.bySku(storeId, productId, sku),
    queryFn: () => api.variants.getVariantBySku(storeId, productId, sku),
    enabled: !!storeId && !!productId && !!sku,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useVariantMutations(storeId: string, productId: string) {
  const queryClient = useQueryClient();

  const createVariant = useMutation({
    mutationFn: (data: CreateVariantDto) =>
      api.variants.createVariant(storeId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.variants(storeId, productId)
      );
      toast.success('Variant created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variant');
    },
  });

  const updateVariant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVariantDto }) =>
      api.variants.updateVariant(storeId, productId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      queryClient.invalidateQueries(
        invalidateFeature.variants(storeId, productId)
      );
      toast.success('Variant updated successfully');
    },
    onError: () => toast.error('Failed to update variant'),
  });

  const deleteVariant = useMutation({
    mutationFn: (variantId: string) =>
      api.variants.deleteVariant(storeId, productId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.variants(storeId, productId)
      );
      toast.success('Variant deleted successfully');
    },
    onError: () => toast.error('Failed to delete variant'),
  });

  const setInventory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetInventoryDto }) =>
      api.variants.setInventory(storeId, productId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      toast.success('Inventory updated successfully');
    },
    onError: () => toast.error('Failed to update inventory'),
  });

  const adjustInventory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustInventoryDto }) =>
      api.variants.adjustInventory(storeId, productId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      toast.success('Inventory adjusted successfully');
    },
    onError: () => toast.error('Failed to adjust inventory'),
  });

  const updatePrice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceDto }) =>
      api.variants.updatePrice(storeId, productId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      toast.success('Price updated successfully');
    },
    onError: () => toast.error('Failed to update price'),
  });

  const addAttributes = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddAttributesDto }) =>
      api.variants.addAttributes(storeId, productId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      toast.success('Attributes added successfully');
    },
    onError: () => toast.error('Failed to add attributes'),
  });

  const removeAttribute = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      api.variants.removeAttribute(storeId, productId, id, key),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.variants.detail(storeId, productId, id),
      });
      toast.success('Attribute removed successfully');
    },
    onError: () => toast.error('Failed to remove attribute'),
  });

  return {
    createVariant,
    updateVariant,
    deleteVariant,
    setInventory,
    adjustInventory,
    updatePrice,
    addAttributes,
    removeAttribute,
  };
}
