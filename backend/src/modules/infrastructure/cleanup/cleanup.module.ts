import { Global, Module } from '@nestjs/common';
import { CleanupSchedulerService } from 'src/modules/infrastructure/cleanup/cleanup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { AnalyticsEvent } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { Confirmation } from 'src/entities/user/authentication/confirmation.entity';
import { RefreshToken } from 'src/entities/user/authentication/refresh-token.entity';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';

/**
 * InterceptorsModule (Global)
 *
 * Provides global interceptors that can be used anywhere.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ShoppingCart,
      AnalyticsEvent,
      Confirmation,
      RefreshToken,
      InventoryNotificationLog,
      NewsNotificationLog,
      OrderNotificationLog,
    ]),
  ],
  providers: [CleanupSchedulerService],
})
export class CleanupModule {}
