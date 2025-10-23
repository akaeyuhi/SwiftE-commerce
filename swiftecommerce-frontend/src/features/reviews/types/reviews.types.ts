import { User } from '@/features/users/types/users.types.ts';
import { Product } from '@/features/products/types/product.types.ts';

export interface Review {
  id: string;
  userId: string;
  user: User;
  productId: string;
  product: Product;
  rating: number;
  title: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewDto {
  rating: number;
  title: string;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  comment?: string;
}
