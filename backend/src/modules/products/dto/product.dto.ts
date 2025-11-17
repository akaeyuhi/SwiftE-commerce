import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { Review } from 'src/entities/store/review.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryDto } from 'src/modules/store/categories/dto/category.dto';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { VariantDto } from 'src/modules/store/variants/dto/variants.dto';
import { ReviewDto } from 'src/modules/products/reviews/dto/review.dto';

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
  store?: StoreDto;
  @ApiProperty({
    type: () => [CategoryDto],
    required: false,
  })
  categories?: CategoryDto[];
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
  variants?: ProductVariant[];
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
  store?: StoreDto;

  // Categories
  @ApiProperty({
    type: () => [CategoryDto],
    required: false,
  })
  categories: CategoryDto[];

  // Photos
  @ApiProperty({
    type: () => ProductPhoto,
    required: false,
  })
  mainPhoto?: ProductPhoto;
  @ApiProperty({
    type: () => [ProductPhoto],
    required: false,
  })
  photos: ProductPhoto[];

  // Variants with stock info
  @ApiProperty({
    type: () => [VariantDto],
    required: false,
  })
  variants: VariantDto[];

  // Recent reviews
  recentReviews: ReviewDto[];

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
