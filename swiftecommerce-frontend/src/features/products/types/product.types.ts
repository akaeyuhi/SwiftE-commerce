export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}
