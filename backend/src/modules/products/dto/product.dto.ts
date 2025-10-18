import { Store } from 'src/entities/store/store.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { Review } from 'src/entities/store/review.entity';

/**
 * Full product DTO with all fields and relations
 */
export class ProductDto {
  id?: string;
  name: string;
  description?: string;

  // Cached statistics
  averageRating?: number;
  reviewCount?: number;
  totalSales?: number;
  likeCount?: number;
  viewCount?: number;
  mainPhotoUrl?: string;

  createdAt?: Date;
  updatedAt?: Date;

  // Relations (optional, loaded as needed)
  store?: Store;
  categories?: Category[];
  variants?: ProductVariant[];
  photos?: ProductPhoto[];
  reviews?: Review[];
}

/**
 * Lightweight DTO for product listings
 */
export class ProductListDto {
  id: string;
  name: string;
  description?: string;
  averageRating?: number;
  reviewCount: number;
  likeCount: number;
  viewCount: number;
  totalSales: number;
  mainPhotoUrl?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Detailed DTO for product detail pages
 */
export class ProductDetailDto {
  id: string;
  name: string;
  description?: string;

  // Stats
  averageRating?: number;
  reviewCount: number;
  likeCount: number;
  viewCount: number;
  totalSales: number;

  // Store
  storeId?: string;
  storeName?: string;

  // Categories
  categories: Array<{
    id: string;
    name: string;
  }>;

  // Photos
  mainPhoto?: {
    id: string;
    url: string;
    altText?: string;
  };
  photos: Array<{
    id: string;
    url: string;
    altText?: string;
  }>;

  // Variants with stock info
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    attributes?: Record<string, any>;
    inStock?: boolean;
    stockQuantity?: number;
  }>;

  // Recent reviews
  recentReviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    userName: string;
    createdAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stats-only DTO for analytics
 */
export class ProductStatsDto {
  id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  likeCount: number;
  viewCount: number;
  totalSales: number;
  conversionRate?: number; // (sales / views) * 100
}

export class TrendingProductDto extends ProductListDto {
  trendingScore?: number;
  recentViews?: number;
  recentLikes?: number;
  recentSales?: number;
}
