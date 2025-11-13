import { StateCreator } from 'zustand';
import { Store, StoreRole } from '@/features/stores/types/store.types.ts';
import { ShoppingCart } from '@/features/cart/types/cart.types.ts';
import { Order } from '@/features/orders/types/order.types.ts';
import { Review } from '@/features/reviews/types/reviews.types.ts';
import { NewsPost } from '@/features/news/types/news.types.ts';
import { AiLog } from '@/features/ai/types/ai-logs.types.ts';
import { Like } from '@/features/likes/types/likes.types.ts';
import { AdminRoles } from '@/lib/enums/site-roles.enum.ts';

/**
 * User type
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  avatarUrl?: string;
  siteRole: AdminRoles;
  ownedStores?: Store[];
  roles?: StoreRole[];
  carts?: ShoppingCart[];
  orders?: Order[];
  reviews?: Review[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  likes?: Like[];
}
/**
 * Cart item type
 */
export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
}

/**
 * Theme type
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Language type
 */
export type Language = 'en' | 'es' | 'fr' | 'de';

/**
 * Currency type
 */
export type Currency = 'USD' | 'EUR' | 'GBP';

/**
 * Helper type for creating slices with middleware
 */
export type SliceCreator<T> = StateCreator<
  T,
  [['zustand/devtools', never]],
  [],
  T
>;
