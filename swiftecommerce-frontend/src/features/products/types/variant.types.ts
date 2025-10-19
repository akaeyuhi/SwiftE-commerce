export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
