import { BaseService } from 'src/common/abstracts/base.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginatedResult } from 'src/common/interfaces/paginated-result.interface';
import { ObjectLiteral } from 'typeorm';

export abstract class PaginatedService<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
> extends BaseService<Entity, CreateDto, UpdateDto, TransferDto> {
  abstract paginate(
    pagination: PaginationDto,
    filter?: Record<string, any>
  ): Promise<PaginatedResult<TransferDto>>;
}
