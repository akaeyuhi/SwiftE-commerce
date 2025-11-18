import { Product } from '@/features/products/types/product.types.ts';
import { Inventory } from '@/features/inventory/types/inventory.types.ts';

export interface ProductVariant {
  id: string;
  productId: string;
  storeId: string;
  product: Product;
  productName: string;
  sku: string;
  price: number;
  attributes?: Record<string, any>;
  inventory: Inventory;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVariantDto {
  name: string;
  sku: string;
  price: number;
  inventory?: Inventory;
  attributes?: Record<string, string>;
}

export interface UpdateVariantDto {
  name?: string;
  sku?: string;
  price?: number;
  inventory?: number;
  attributes?: Record<string, string>;
}

export interface SetInventoryDto {
  quantity: number;
}

export interface AdjustInventoryDto {
  adjustment: number;
}

export interface UpdatePriceDto {
  price: number;
}

export interface AddAttributesDto {
  attributes: Record<string, string>;
}
