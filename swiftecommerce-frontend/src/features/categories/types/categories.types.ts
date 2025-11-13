import { Store } from '@/features/stores/types/store.types.ts';
import { Product } from '@/features/products/types/product.types.ts';

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  store?: Store;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  products?: Product[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDto {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  children?: CategoryDto[];
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  parentId?: string;
}
