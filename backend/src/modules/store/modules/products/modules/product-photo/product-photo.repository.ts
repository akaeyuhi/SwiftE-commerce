import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductPhoto } from 'src/entities/store/product-photo.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductPhotoRepository extends BaseRepository<ProductPhoto> {
  constructor(dataSource: DataSource) {
    super(ProductPhoto, dataSource.createEntityManager());
  }
}
