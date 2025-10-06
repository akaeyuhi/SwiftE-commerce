// src/modules/store/dto/store.dto.ts
import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';

export class StoreDto {
  id?: string;
  name: string;
  description: string;
  owner: User;

  // Cached statistics (automatically maintained by DB triggers)
  productCount?: number;
  followerCount?: number;
  totalRevenue?: number;
  orderCount?: number;

  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, load as needed)
  products?: Product[];
  orders?: Order[];
  carts?: ShoppingCart[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  storeRoles?: StoreRole[];
}

// Lightweight DTO for lists (without relations)
export class StoreListDto {
  id: string;
  name: string;
  description: string;
  productCount: number;
  followerCount: number;
  totalRevenue: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Stats-only DTO for analytics
export class StoreStatsDto {
  id: string;
  name: string;
  productCount: number;
  followerCount: number;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue?: number; // calculated: totalRevenue / orderCount
}
