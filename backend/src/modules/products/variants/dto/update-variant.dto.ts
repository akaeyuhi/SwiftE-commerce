import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from 'src/modules/products/variants/dto/create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
