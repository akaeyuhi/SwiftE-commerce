import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
