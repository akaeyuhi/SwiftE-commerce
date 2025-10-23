import { Store } from '@/features/stores/types/store.types.ts';
import { ProductVariant } from '@/features/products/types/variant.types.ts';

export interface Inventory {
  id: string;
  variantId: string;
  variant: ProductVariant;
  storeId: string;
  store: Store;
  quantity: number;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
