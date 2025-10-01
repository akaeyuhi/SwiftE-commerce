import { IsArray, IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnOrderDto {
  @ApiProperty({
    description: 'Order item IDs being returned (omit for full return)',
    type: [String],
    required: false,
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  itemIds?: string[];

  @ApiProperty({
    description: 'Return reason',
    example: 'Product defective',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
