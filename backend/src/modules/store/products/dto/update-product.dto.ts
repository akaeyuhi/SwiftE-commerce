import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from 'src/modules/store/products/dto/create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
