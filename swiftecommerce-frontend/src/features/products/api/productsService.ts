import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import { Product, ProductListDto } from '../types/product.types';
import {
  ProductFilters,
  ProductSearchOptions,
} from '@/shared/types/filters.types.ts';
import {
  CreateProductDto,
  UpdateProductDto,
} from '@/features/products/types/dto.types.ts';

export interface ProductStats {
  views: number;
  sales: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  conversionRate: number;
}

export interface QuickStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
}

export interface TopProductsParams {
  limit?: number;
  period?: 'day' | 'week' | 'month' | 'year';
}

export class ProductsService extends BaseService {
  async getAllProducts(
    filters?: ProductFilters
  ): Promise<PaginatedResponse<ProductListDto>> {
    const urlWithParams = this.buildQueryUrl(
      API_ENDPOINTS.PRODUCTS.LIST_ALL,
      filters
    );
    return this.client.get<PaginatedResponse<ProductListDto>>(urlWithParams);
  }

  async searchProductsPublic(
    filters?: ProductSearchOptions
  ): Promise<PaginatedResponse<ProductListDto>> {
    const urlWithParams = this.buildQueryUrl(
      API_ENDPOINTS.PRODUCTS.SEARCH,
      filters
    );
    return this.client.get<PaginatedResponse<ProductListDto>>(urlWithParams);
  }

  /**
   * Get all products for a store
   */
  async getProducts(
    storeId: string,
    filters?: ProductFilters
  ): Promise<PaginatedResponse<ProductListDto>> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.LIST_FILTERED, { storeId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    return this.client.get<PaginatedResponse<ProductListDto>>(urlWithParams);
  }

  /**
   * Get all products for a store
   */
  async getAllProductsByStore(
    storeId: string,
    filters?: ProductFilters
  ): Promise<PaginatedResponse<ProductListDto>> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.LIST_BY_STORE, { storeId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    return this.client.get<any>(urlWithParams);
  }

  /**
   * Get products by store (alternative endpoint)
   */
  async getProductsByStore(
    storeId: string,
    filters?: ProductFilters
  ): Promise<Product[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.LIST_BY_STORE, { storeId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    return this.client.get<Product[]>(urlWithParams);
  }

  /**
   * Get single product
   */
  async getProduct(storeId: string, productId: string): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.FIND_ONE, {
      storeId,
      id: productId,
    });
    return this.client.get<Product>(url);
  }

  /**
   * Get single product
   */
  async getPublicProduct(productId: string): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.FIND_PUBLIC, {
      id: productId,
    });
    return this.client.get<Product>(url);
  }

  /**
   * Get detailed product (with all relations)
   */
  async getProductDetailed(
    storeId: string,
    productId: string
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.FIND_DETAILED, {
      storeId,
      id: productId,
    });
    return this.client.get<Product>(url);
  }

  /**
   * Create product
   */
  async createProduct(
    storeId: string,
    data: CreateProductDto
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.CREATE, { storeId });
    if (data.photos || data.mainPhoto) {
      const { formData, headers } = this.mapToFormData(data);
      return this.client.post<Product>(url, formData, {
        headers,
      });
    } else {
      return this.client.post<Product>(url, data);
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    storeId: string,
    productId: string,
    data: UpdateProductDto
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.UPDATE, {
      storeId,
      id: productId,
    });
    if (data.photos || data.mainPhoto) {
      const { formData, headers } = this.mapToFormData(data);
      return this.client.put<Product>(url, formData, {
        headers,
      });
    } else {
      return this.client.put<Product>(url, data);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(storeId: string, productId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.DELETE, {
      storeId,
      id: productId,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Soft delete product
   */
  async softDeleteProduct(
    storeId: string,
    productId: string
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.SOFT_DELETE, {
      storeId,
      id: productId,
    });
    return this.client.delete<Product>(url);
  }

  /**
   * Search products
   */
  async searchProducts(
    storeId: string,
    query: string,
    filters?: ProductFilters
  ): Promise<Product[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.SEARCH, { storeId });
    const urlWithParams = this.buildQueryUrl(url, {
      q: query,
      ...filters,
    } as any);
    return this.client.get<Product[]>(urlWithParams);
  }

  /**
   * Advanced search
   */
  async advancedSearchProducts(
    storeId: string,
    searchParams: Record<string, any>
  ): Promise<Product[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.ADVANCED_SEARCH, { storeId });
    return this.client.post<Product[]>(url, searchParams);
  }

  /**
   * Autocomplete search
   */
  async autocompleteProducts(
    storeId: string,
    query: string
  ): Promise<string[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.AUTOCOMPLETE, { storeId });
    const urlWithParams = this.buildQueryUrl(url, { q: query });
    return this.client.get<string[]>(urlWithParams);
  }

  /**
   * Get product stats
   */
  async getProductStats(
    storeId: string,
    productId: string
  ): Promise<ProductStats> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.STATS, {
      storeId,
      id: productId,
    });
    return this.client.get<ProductStats>(url);
  }

  /**
   * Get product quick stats
   */
  async getProductQuickStats(
    storeId: string,
    productId: string
  ): Promise<QuickStats> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.QUICK_STATS, {
      storeId,
      id: productId,
    });
    return this.client.get<QuickStats>(url);
  }

  /**
   * Upload product photos
   */
  async uploadPhotos(
    storeId: string,
    productId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));

    const url = buildUrl(API_ENDPOINTS.PRODUCTS.ADD_PHOTOS, {
      storeId,
      id: productId,
    });

    return this.client.request<string[]>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  }

  /**
   * Upload main photo
   */
  async uploadMainPhoto(
    storeId: string,
    productId: string,
    file: File
  ): Promise<string> {
    const formData = new FormData();
    formData.append('photo', file);

    const url = buildUrl(API_ENDPOINTS.PRODUCTS.ADD_MAIN_PHOTO, {
      storeId,
      id: productId,
    });

    return this.client.request<string>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Delete product photo
   */
  async deletePhoto(
    storeId: string,
    productId: string,
    photoId: string
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.DELETE_PHOTO, {
      storeId,
      productId,
      photoId,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    storeId: string,
    categoryId: string,
    filters?: ProductFilters
  ): Promise<Product[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.BY_CATEGORY, {
      storeId,
      categoryId,
    });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    return this.client.get<Product[]>(urlWithParams);
  }

  /**
   * Assign category to product
   */
  async assignCategory(
    storeId: string,
    productId: string,
    categoryId: string
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.ASSIGN_CATEGORY, {
      storeId,
      id: productId,
      categoryId,
    });
    return this.client.post<Product>(url);
  }

  /**
   * Remove category from product
   */
  async removeCategory(
    storeId: string,
    productId: string,
    categoryId: string
  ): Promise<Product> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.REMOVE_CATEGORY, {
      storeId,
      id: productId,
      categoryId,
    });
    return this.client.delete<Product>(url);
  }

  /**
   * Recalculate product stats
   */
  async recalculateStats(
    storeId: string,
    productId: string
  ): Promise<ProductStats> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.RECALCULATE_STATS, {
      storeId,
      id: productId,
    });
    return this.client.post<ProductStats>(url);
  }

  /**
   * Increment product view count
   */
  async incrementView(storeId: string, productId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.INCREMENT_VIEW, {
      storeId,
      id: productId,
    });
    return this.client.post<void>(url);
  }

  /**
   * Get top products by views
   */
  async getTopByViews(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.TOP_BY_VIEWS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get top products by sales
   */
  async getTopBySales(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.TOP_BY_SALES, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get top rated products
   */
  async getTopRated(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.TOP_RATED, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get top products by conversion
   */
  async getTopByConversion(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.TOP_BY_CONVERSION, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.PRODUCTS.TRENDING, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }
}

interface ProductPerformance {
  productId: string;
  name: string;
  revenue: number;
  sales: number;
  views: number;
  conversionRate: number;
  averageRating?: number;
}

export const productsService = new ProductsService();
