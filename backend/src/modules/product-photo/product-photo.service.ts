import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { ProductPhoto } from 'src/entities/product-photo.entity';
import { ProductPhotoRepository } from 'src/modules/product-photo/product-photo.repository';

@Injectable()
export class ProductPhotoService extends BaseService<ProductPhoto> {
  constructor(protected readonly photoRepository: ProductPhotoRepository) {
    super(photoRepository);
  }
}
