import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsMapper } from './mappers/products.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [ProductRepository, ProductsService, ProductsMapper],
  controllers: [ProductsController],
})
export class ProductsModule {}
