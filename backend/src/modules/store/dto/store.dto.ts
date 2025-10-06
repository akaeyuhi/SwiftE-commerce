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
  createdAt: Date;
  updatedAt: Date;
  // Relations
  products?: Product[];
  orders?: Order[];
  carts?: ShoppingCart[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  storeRoles?: StoreRole[];
}
