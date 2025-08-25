import { User } from 'src/entities/user.entity';
import { Product } from 'src/entities/product.entity';
import { Order } from 'src/entities/order.entity';
import { ShoppingCart } from 'src/entities/cart.entity';
import { NewsPost } from 'src/entities/news-post.entity';
import { AiLog } from 'src/entities/ai-log.entity';
import { UserRole } from 'src/entities/user-role.entity';

export class StoreDto {
  id?: string;
  name: string;
  description: string;
  ownerUser: User;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  products?: Product[];
  orders?: Order[];
  carts?: ShoppingCart[];
  newsPosts?: NewsPost[];
  aiLogs?: AiLog[];
  userRoles?: UserRole[];
}
