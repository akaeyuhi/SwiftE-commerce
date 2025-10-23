import { Product } from '@/features/products/types/product.types.ts';
import { ProductVariant } from '@/features/products/types/variant.types.ts';
import { Store } from '@/features/stores/types/store.types.ts';
import { User } from '@sentry/react';

export interface Order {
  id: string;
  userId: string;
  user: User;
  storeId: string;
  store: Store;
  status: OrderStatus;
  totalAmount: number;
  shipping: OrderInfo;
  billing?: OrderInfo;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderInfo {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  order: Order;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  productName: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  shipping: OrderInfo;
  billing?: OrderInfo;
}

export type UpdateOrderDto = Partial<CreateOrderDto>;

export interface CreateOrderItemDto {
  variantId: string;
  productId: string;
  productName: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
}

export interface UpdateOrderStatusDto {
  orderStatus: OrderStatus;
}
