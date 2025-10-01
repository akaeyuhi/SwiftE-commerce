import { Global, Module } from '@nestjs/common';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import { OrderNotificationModule } from 'src/modules/infrastructure/notifications/order/order-notification.module';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';
import { InventoryNotificationModule } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.module';
import { NewsNotificationModule } from 'src/modules/infrastructure/notifications/news/news-notification.module';

@Global()
@Module({
  imports: [
    InventoryNotificationModule,
    OrderNotificationModule,
    NewsNotificationModule,
  ],
  providers: [
    InventoryNotificationService,
    OrderNotificationService,
    NewsNotificationModule,
  ],
  exports: [
    InventoryNotificationService,
    OrderNotificationService,
    NewsNotificationModule,
  ],
})
export class NotificationsModule {}
