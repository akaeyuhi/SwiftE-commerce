import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SeedService } from 'src/modules/infrastructure/seeders/seed.service';
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
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { ProductDailyStats } from 'src/entities/infrastructure/analytics/product-daily-stats.entity';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import { AnalyticsEvent } from 'src/entities/infrastructure/analytics/analytics-event.entity';

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
      Admin,
      StoreRole,
      ProductPhoto,
      ProductDailyStats,
      StoreDailyStats,
      AnalyticsEvent,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
