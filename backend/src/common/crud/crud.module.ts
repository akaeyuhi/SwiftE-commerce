import { DynamicModule, Module, Type } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { BaseController } from 'src/common/abstracts/base.controller';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { ObjectLiteral } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

interface CrudOptions<Entity extends ObjectLiteral, Dto, CreateDto, UpdateDto> {
  entity: Type<Entity>;
  repository: Type<BaseRepository<Entity>>;
  service: Type<BaseService<Entity, Dto, CreateDto, UpdateDto>>;
  controller: Type<BaseController<Entity, Dto, CreateDto, UpdateDto>>;
  mapper: Type<BaseMapper<Entity, Dto>>;
}

@Module({})
export class CrudModule {
  static forFeature
  <E extends ObjectLiteral, D, C, U>(opts: CrudOptions<E, D, C, U>): DynamicModule {
    return {
      module: CrudModule,
      imports: [TypeOrmModule.forFeature([opts.entity])],
      providers: [opts.repository, opts.service, opts.mapper],
      controllers: [opts.controller],
      exports: [opts.service],
    };
  }
}
