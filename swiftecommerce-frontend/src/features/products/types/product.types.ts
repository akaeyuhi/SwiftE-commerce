import { Review } from '@/features/reviews/types/reviews.types.ts';
import { Store } from '@/features/stores/types/store.types';
import { Category } from '@/features/categories/types/categories.types.ts';
import { ProductVariant } from '@/features/products/types/variant.types.ts';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  averageRating?: number;
  reviewCount: number;
  totalSales: number;
  likeCount: number;
  viewCount: number;
  mainPhotoUrl: string;
  variants: ProductVariant[];
  photos: ProductPhoto[];
  reviews: Review[];
  store?: Store;
  categories?: Category[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ProductListDto {
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
  categories: Category[];
  variants: ProductVariant[];
}

export interface ProductPhoto {
  id: string;
  product: Product;
  url: string;
  altText?: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}
