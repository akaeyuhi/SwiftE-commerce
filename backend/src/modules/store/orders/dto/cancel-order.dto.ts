import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
