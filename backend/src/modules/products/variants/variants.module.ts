import { Module } from '@nestjs/common';
import { VariantsService } from 'src/modules/products/variants/variants.service';
import { VariantsController } from 'src/modules/products/variants/variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { VariantsRepository } from 'src/modules/products/variants/variants.repository';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant]), InventoryModule],
  controllers: [VariantsController],
  providers: [VariantsService, VariantsRepository],
})
export class VariantsModule {}
