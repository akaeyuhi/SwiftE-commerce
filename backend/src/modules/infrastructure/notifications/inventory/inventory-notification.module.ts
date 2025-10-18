import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryNotificationLog])],
  providers: [InventoryNotificationService],
  exports: [InventoryNotificationService],
})
export class InventoryNotificationModule {}
