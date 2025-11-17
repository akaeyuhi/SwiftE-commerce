import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { Type } from 'class-transformer';
import {
  ParseArray,
  ParseJson,
} from 'src/common/decorators/parse-json.decorator';

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  @IsOptional()
  storeId: string;

  /**
   * Optional category id (UUID) to assign product to a category.
   */
  @IsOptional()
  @ParseArray()
  @IsArray()
  categoryIds?: string[];

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  files?: {
    photos: Express.Multer.File[];
    mainPhoto: Express.Multer.File[];
  };

  @IsOptional()
  @ParseJson()
  @ValidateNested()
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
