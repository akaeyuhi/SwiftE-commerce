import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { IsOptional, IsPositive } from 'class-validator';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @IsPositive()
  @IsOptional()
  price: number;

  @IsOptional()
  @IsPositive()
  quantity: number;
}
