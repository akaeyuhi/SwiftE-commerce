import { Module } from '@nestjs/common';
import { ProductPhotoService } from 'src/modules/store/products/product-photo/product-photo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { ProductPhotoRepository } from 'src/modules/store/products/product-photo/product-photo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProductPhoto])],
  providers: [ProductPhotoService, ProductPhotoRepository],
})
export class ProductPhotoModule {}
