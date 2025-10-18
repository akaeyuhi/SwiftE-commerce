import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderNotificationLog])],
  providers: [OrderNotificationService],
  exports: [OrderNotificationService],
})
export class OrderNotificationModule {}
