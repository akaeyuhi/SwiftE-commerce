import { Store } from '@/features/stores/types/store.types.ts';
import { ProductVariant } from '@/features/products/types/variant.types.ts';
import { User } from '@/features/users/types/users.types.ts';

export interface ShoppingCart {
  id: string;
  user: User;
  store: Store;
  items: CartItem[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  cart: ShoppingCart;
  variantId: string;
  variant: ProductVariant;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemDto {
  cartId: string;
  variantId: string;
  productId: string;
  quantity: number;
}

export interface CreateCartDto {
  userId: string;
  storeId: string;
  products: CartItemDto[];
}

export interface UpdateCartItemQuantityDto {
  quantity: number;
}
