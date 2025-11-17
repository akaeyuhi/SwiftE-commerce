import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ParseJson } from 'src/common/decorators/parse-json.decorator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @ParseJson()
  @Type(() => UpdateVariantDto)
  @ValidateNested()
  updateVariants: UpdateVariantDto[];
}
