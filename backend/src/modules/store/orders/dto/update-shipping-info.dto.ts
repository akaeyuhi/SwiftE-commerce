import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateShippingInfoDto {
  @IsString()
  @IsOptional()
  trackingNumber?: string;
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
  @IsString()
  @IsOptional()
  shippingMethod?: string;
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;
}
