import {
  Category,
  CategoryDto,
} from '@/features/categories/types/categories.types';
import {
  Product,
  ProductListDto,
} from '@/features/products/types/product.types';
import { Inventory } from '@/features/inventory/types/inventory.types.ts';
import { Order } from '@/features/orders/types/order.types.ts';
import { NewsPost } from '@/features/news/types/news.types.ts';
import { AiLog } from '@/features/ai/types/ai-logs.types.ts';
import { User, UserDto } from '@/features/users/types/users.types.ts';
import { ShoppingCart } from '@/features/cart/types/cart.types.ts';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';

export interface Store {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  owner: User;
  productCount: number;
  followerCount: number;
  totalRevenue: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  logoUrl?: string;
  bannerUrl?: string;
  products?: Product[];
  categories?: Category[];
  inventories?: Inventory[];
  orders?: Order[];
  carts?: ShoppingCart[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  storeRoles?: StoreRole[];
}

export interface StoreDto {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  owner?: UserDto;
  productCount: number;
  followerCount: number;
  totalRevenue: number;
  orderCount: number;
  createdAt: Date;
  city: string;
  country: string;
  updatedAt: Date;
  products?: ProductListDto[];
  categories?: CategoryDto[];
  roles?: StoreRole[];
  logoUrl: string;
  bannerUrl: string;
}

export interface CreateStoreDto {
  name: string;
  description: string;
  ownerId: string;
  logo?: File;
  banner?: File;
}

export interface UpdateStoreDto {
  name?: string;
  description?: string;
  logo?: File;
  banner?: File;
}

export interface StoreStatsDto {
  id: string;
  name: string;
  productCount: number;
  followerCount: number;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue?: number;
}

export interface StoreSearchResultDto extends StoreStatsDto {
  matchType?: Record<string, any>;
}

export interface StoreRole {
  id: string;
  roleName: StoreRoles;
  user: User;
  userId: string;
  store: Store;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  assignedBy?: string;
  assignedAt: Date;
  revokedBy?: string;
  revokedAt?: Date;
  metadata?: Record<string, any>;
}

export interface StoreOverviewDto {
  stats: {
    totalRevenue: number;
    productCount: number;
    orderCount: number;
    conversionRate: number;
  };
  recentOrders: Array<{
    id: string;
    customerName: string;
    productName: string;
    amount: number;
    status: 'completed' | 'processing' | 'pending' | 'cancelled';
    createdAt: Date;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    salesCount: number;
    revenue: number;
  }>;
}
