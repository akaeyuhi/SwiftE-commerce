import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryDto } from 'src/modules/store/inventory/dto/create-inventory.dto';

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {
  @ApiProperty({
    description: 'New quantity',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  quantity: number;
}
