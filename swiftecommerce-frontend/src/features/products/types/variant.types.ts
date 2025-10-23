import { Product } from '@/features/products/types/product.types.ts';
import { Inventory } from '@/features/inventory/types/inventory.types.ts';

export interface ProductVariant {
  id: string;
  productId: string;
  product: Product;
  sku: string;
  price: number;
  attributes?: Record<string, any>;
  inventory: Inventory;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVariantRequest {
  name: string;
  sku: string;
  price: number;
  inventory?: number;
  attributes?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateVariantRequest {
  name?: string;
  sku?: string;
  price?: number;
  inventory?: number;
  attributes?: Record<string, string>;
  isActive?: boolean;
}

export interface SetInventoryRequest {
  quantity: number;
  reason?: string;
}

export interface AdjustInventoryRequest {
  adjustment: number;
  reason?: string;
}

export interface UpdatePriceRequest {
  price: number;
}

export interface AddAttributesRequest {
  attributes: Record<string, string>;
}
