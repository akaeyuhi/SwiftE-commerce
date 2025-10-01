import { Module } from '@nestjs/common';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryThresholdsConfig } from 'src/modules/store/inventory/config/inventory-thresholds.config';
import { ConfigModule } from '@nestjs/config';
import { InventoryNotificationsAdminController } from 'src/modules/store/inventory/controllers/inventory-notifications-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    StoreRoleModule,
    ConfigModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [InventoryNotificationsAdminController],
  providers: [InventoryService, InventoryRepository, InventoryThresholdsConfig],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
