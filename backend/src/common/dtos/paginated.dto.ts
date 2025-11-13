import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}

export class PaginatedDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: () => PaginatedMetaDto })
  meta: PaginatedMetaDto;
}
