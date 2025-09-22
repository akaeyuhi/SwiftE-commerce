import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from 'src/modules/store/products/variants/dto/create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
