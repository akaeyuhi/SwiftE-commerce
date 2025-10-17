import { IsUUID, IsNumber, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'Variant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  variantId: string;

  @ApiProperty({
    description: 'Store UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  storeId: string;

  @ApiProperty({
    description: 'Initial quantity',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsPositive()
  quantity: number;
}
