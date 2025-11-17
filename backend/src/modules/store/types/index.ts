import { StoreStatsDto } from 'src/modules/store/dto/store.dto';
import { Order } from 'src/entities/store/product/order.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from '@/features/stores/types/store.types';
import { ProductVariant } from '@/features/products/types/variant.types';
import { User } from '@/features/users/types/users.types';

export interface StoreSearchOptions {
  query?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minProducts?: number;
  maxProducts?: number;
  minFollowers?: number;
  maxFollowers?: number;
  sortBy?: 'name' | 'revenue' | 'followers' | 'products' | 'recent';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface StoreSearchByNameOptions {
  sortBy?: 'relevance' | 'followers' | 'revenue' | 'products' | 'recent';
  minFollowers?: number;
  minProducts?: number;
}

export interface StoreOverviewDto {
  stats: StoreStatsDto;
  recentOrders: Order[];
  topProducts: Product[];
}

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
  variantId: string;
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
