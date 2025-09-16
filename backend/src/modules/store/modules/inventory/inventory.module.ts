import { Module } from '@nestjs/common';
import { InventoryRepository } from 'src/modules/store/modules/inventory/inventory.repository';
import { Inventory } from 'src/entities/inventory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory])],
  providers: [InventoryRepository],
})
export class InventoryModule {}
