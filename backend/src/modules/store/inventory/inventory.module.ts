import { Module } from '@nestjs/common';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    StoreRoleModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
