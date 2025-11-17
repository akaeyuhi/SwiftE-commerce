import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVariantDto {
  @IsUUID() @IsOptional() productId?: string;
  @IsNumber() @IsPositive() price: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() attributes?: Record<string, any>;
  @IsOptional() stock?: number;
  @IsOptional() initialQuantity?: number = 0;
  @IsOptional() @IsUUID() storeId?: string;
}
