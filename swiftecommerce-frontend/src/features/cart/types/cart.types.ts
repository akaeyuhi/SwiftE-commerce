import { Store } from '@/features/stores/types/store.types.ts';
import { ProductVariant } from '@/features/products/types/variant.types.ts';
import { User } from '@/features/users/types/users.types.ts';

/**
 * Represents the full shopping cart structure as returned by the backend.
 */
export interface ShoppingCart {
  id: string;
  user: User;
  store: Store;
  items: CartItem[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a single item within a cart, as returned by the backend API.
 */
export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  variant: ProductVariant;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  /** This property is added programmatically on the client-side for convenience. */
  cart: ShoppingCart;
}

/**
 * Data Transfer Object for adding a new item to a cart.
 */
export interface CartItemDto {
  variantId: string;
  quantity: number;
  productId?: string; // Optional: Useful for analytics or other backend logic
}

/**
 * Data Transfer Object for creating or syncing a cart with a set of products.
 */
export interface CreateCartDto {
  products: CartItemDto[];
}

/**
 * Data Transfer Object for updating the quantity of an existing cart item.
 */
export interface UpdateCartItemQuantityDto {
  quantity: number;
}
