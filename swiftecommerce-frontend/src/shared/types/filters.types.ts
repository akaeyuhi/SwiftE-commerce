import { OrderStatus } from '@/features/orders/types/order.types.ts';

export interface ProductFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  inStock?: boolean;
}

export interface StoreFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  minRevenue?: number;
  maxRevenue?: number;
}

export interface ReviewFilters {
  rating?: number;
  minRating?: number;
  maxRating?: number;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'rating' | 'helpful' | 'recent';
}

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface NewsFilters {
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'recent' | 'popular' | 'title';
}
