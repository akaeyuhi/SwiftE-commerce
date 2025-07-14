import { BaseService } from 'src/common/abstracts/base.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginatedResult } from 'src/common/interfaces/paginated-result.interface';

export abstract class PaginatedService<
  Entity,
  Dto,
  CreateDto,
  UpdateDto,
> extends BaseService<Entity, Dto, CreateDto, UpdateDto> {
  abstract paginate(
    pagination: PaginationDto,
    filter?: Record<string, any>
  ): Promise<PaginatedResult<Dto>>;
}
