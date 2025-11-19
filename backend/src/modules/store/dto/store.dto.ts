import { Order } from 'src/entities/store/product/order.entity';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';
import { ProductListDto } from 'src/modules/products/dto/product.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryDto } from 'src/modules/store/categories/dto/category.dto';
import { Product } from 'src/entities/store/product/product.entity';

export class StoreDto {
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  owner: UserDto;

  logoUrl?: string;
  bannerUrl?: string;

  // Cached statistics (automatically maintained by DB triggers)
  productCount?: number;
  followerCount?: number;
  totalRevenue?: number;
  orderCount?: number;
  city?: string;
  country?: string;

  createdAt: Date;
  updatedAt: Date;

  @ApiProperty({
    type: () => [ProductListDto],
    required: false,
  })
  products?: ProductListDto[];
  @ApiProperty({
    type: () => [CategoryDto],
    required: false,
  })
  categories: CategoryDto[];
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
  city?: string;
  country?: string;
  logoUrl?: string;
  bannerUrl?: string;
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

export class StoreSearchResultDto extends StoreListDto {
  matchType: 'exact' | 'startsWith' | 'contains' | 'none';
}

export class StoreOverviewDto {
  stats: StoreStatsDto;
  recentOrders: Order[];
  topProducts: Product[];
}
