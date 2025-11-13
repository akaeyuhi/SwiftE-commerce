import { Product } from '@/features/products/types/product.types.ts';
import { Store } from '@/features/stores/types/store.types.ts';
import { User } from '@/features/users/types/users.types.ts';

export interface Like {
  id: string;
  userId: string;
  user: User;
  productId?: string;
  product?: Product;
  storeId?: string;
  store?: Store;
  createdAt: Date;
  updatedAt: Date;
}
