import {
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from '../modules/order-item/dto/create-order-item.dto';

/**
 * Embedded DTO for shipping / billing address (keeps shape similar to OrderInfo embeddable).
 */
export class OrderInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  deliveryInstructions?: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;
}

/**
 * CreateOrderDto
 *
 * Contains storeId and userId (who places the order), shipping info and
 * an array of CreateOrderItemDto lines.
 *
 * totalAmount is optional — service will compute it from line items if omitted.
 */
export class CreateOrderDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  storeId: string;

  @ValidateNested()
  @Type(() => OrderInfoDto)
  shipping: OrderInfoDto;

  @ValidateNested()
  @Type(() => OrderInfoDto)
  @IsOptional()
  billing?: OrderInfoDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  status?: string; // optional override, default 'pending'
}
