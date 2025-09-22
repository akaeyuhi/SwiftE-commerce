import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product.entity';
import { Order } from 'src/entities/store/order.entity';
import { ShoppingCart } from 'src/entities/store/cart.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AiLog } from 'src/entities/store/ai-log.entity';
import { UserRole } from 'src/entities/user/user-role.entity';

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
