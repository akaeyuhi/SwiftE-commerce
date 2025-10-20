import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Product, ProductFilters } from '../types/product.types';
import { PaginatedResponse } from '@/lib/api/types';
import { api } from '@/lib/api';
import { TopProductsParams } from '@/features/products/api/productsService.ts';

/**
 * Fetch paginated products
 */
export function useProducts(
  storeId: string,
  filters?: ProductFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Product>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.products.list(storeId, filters),
    queryFn: () => api.products.getProducts(storeId, filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch single product
 */
export function useProduct(
  storeId: string,
  productId: string,
  options?: Omit<UseQueryOptions<Product>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.detail(storeId, productId),
    queryFn: () => api.products.getProduct(storeId, productId),
    enabled: !!productId && !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch product variants
 */
export function useProductVariants(
  storeId: string,
  productId: string,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.variants(storeId, productId),
    queryFn: () => api.variants.getVariants(storeId, productId),
    enabled: !!productId && !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch trending products
 */
export function useTrendingProducts(
  storeId: string,
  params?: TopProductsParams,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'trending', storeId, params],
    queryFn: () => api.products.getTrendingProducts(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
