import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SeedService } from './seed.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { Review } from 'src/entities/store/review.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      User,
      Store,
      Category,
      Product,
      ProductVariant,
      Inventory,
      Order,
      OrderItem,
      Review,
      NewsPost,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
