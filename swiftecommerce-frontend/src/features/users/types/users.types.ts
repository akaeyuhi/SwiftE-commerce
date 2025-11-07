import { Store, StoreRole } from '@/features/stores/types/store.types.ts';
import { AiLog } from '@/features/ai/types/ai-logs.types.ts';
import { Order } from '@/features/orders/types/order.types.ts';
import { Review } from '@/features/reviews/types/reviews.types';
import { Like } from '@/features/likes/types/likes.types.ts';
import { ShoppingCart } from '@/features/cart/types/cart.types.ts';
import { NewsPost } from '@/features/news/types/news.types.ts';

export interface NewsPost {
  // ...
}

export interface UserStats {
  totalOrders: number;
  likedProducts: number;
  followedStores: number;
  reviewsWritten: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  siteRole: 'SITE_USER' | 'SITE_ADMIN';
  ownedStores?: Store[];
  roles?: StoreRole[];
  carts?: ShoppingCart[];
  orders?: Order[];
  reviews?: Review[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  likes?: Like[];
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  isEmailVerified: boolean;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  siteRole: string;
  emailVerifiedAt?: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export type UpdateUserDto = Partial<CreateUserDto>;

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
}
