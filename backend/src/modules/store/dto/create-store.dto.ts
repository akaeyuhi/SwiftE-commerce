import {
  IsString,
  IsOptional,
  MinLength,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  country?: string;

  @IsUUID()
  @IsOptional()
  ownerId: string;

  @IsOptional()
  logoFile?: Express.Multer.File;
  @IsOptional()
  bannerFile?: Express.Multer.File;
}
