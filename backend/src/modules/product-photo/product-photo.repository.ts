import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductPhoto } from 'src/entities/product-photo.entity';

@Injectable()
export class ProductPhotoRepository extends Repository<ProductPhoto> {
  constructor(dataSource: DataSource) {
    super(ProductPhoto, dataSource.createEntityManager());
  }
}
