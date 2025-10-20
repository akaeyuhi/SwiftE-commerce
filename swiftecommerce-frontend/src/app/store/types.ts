import { StateCreator } from 'zustand';

/**
 * User type
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'customer' | 'store_owner' | 'admin';
  storeId?: string;
  emailVerified: boolean;
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
