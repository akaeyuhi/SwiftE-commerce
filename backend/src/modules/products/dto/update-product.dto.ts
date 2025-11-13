import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @Type(() => UpdateVariantDto)
  @ValidateNested()
  updateVariants: UpdateVariantDto[];
}
