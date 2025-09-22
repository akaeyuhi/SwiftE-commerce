import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';

@Injectable()
export class ProductsMapper extends BaseMapper<Product, CreateProductDto> {
  toDto(entity: Product): CreateProductDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      storeId: entity.store?.id,
      categoryId: entity.category?.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toEntity(dto: Partial<CreateProductDto>): Product {
    const product = new Product();
    product.id = dto.id!;
    product.name = dto.name!;
    product.description = dto.description;
    return product;
  }
}
