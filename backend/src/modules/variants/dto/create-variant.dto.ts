import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVariantDto {
  @IsUUID() productId: string;
  @IsString() sku: string;
  @IsNumber() price: number;
  @IsOptional() attributes?: Record<string, any>;
  @IsOptional() stock?: number;
  @IsOptional() initialQuantity?: number = 0;
  @IsOptional() @IsUUID() storeId?: string;
}
