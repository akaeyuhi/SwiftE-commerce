import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from 'src/modules/store/modules/products/modules/variants/dto/create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
