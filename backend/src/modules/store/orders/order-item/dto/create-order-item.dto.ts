import {
  IsUUID,
  IsInt,
  Min,
  IsNumber,
  IsOptional,
  IsString, IsPositive,
} from 'class-validator';

/**
 * CreateOrderItemDto
 *
 * Snapshot of what should be persisted for a single order line.
 * Typically you will take this from a cart item (variant id, unit price, product name).
 */
export class CreateOrderItemDto {
  @IsUUID()
  @IsOptional()
  productId?: string; // optional FK to product

  @IsUUID()
  @IsOptional()
  variantId?: string; // optional FK to product variant

  @IsString()
  productName: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
