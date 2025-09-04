import { Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from 'src/entities/variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant])],
  controllers: [VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
