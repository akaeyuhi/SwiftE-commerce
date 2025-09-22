import { Module } from '@nestjs/common';
import { VariantsService } from 'src/modules/store/products/variants/variants.service';
import { VariantsController } from 'src/modules/store/products/variants/variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { VariantsRepository } from 'src/modules/store/products/variants/variants.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant])],
  controllers: [VariantsController],
  providers: [VariantsService, VariantsRepository],
})
export class VariantsModule {}
