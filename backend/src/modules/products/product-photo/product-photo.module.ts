import { Module } from '@nestjs/common';
import { ProductPhotoService } from 'src/modules/products/product-photo/product-photo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductPhoto } from 'src/entities/product-photo.entity';
// eslint-disable-next-line max-len
import { ProductPhotoRepository } from 'src/modules/products/product-photo/product-photo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProductPhoto])],
  providers: [ProductPhotoService, ProductPhotoRepository],
})
export class ProductPhotoModule {}
