import { IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 25;

  // These will be calculated by the decorator
  skip?: number;
  take?: number;
}
