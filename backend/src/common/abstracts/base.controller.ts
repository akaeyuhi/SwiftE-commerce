import { Body, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { BaseService } from './base.service';

export abstract class BaseController<T, Dto, CreateDto, UpdateDto> {
  protected constructor(
    protected readonly service: BaseService<T, Dto, CreateDto, UpdateDto>
  ) {}

  @Get()
  findAll(): Promise<Dto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Dto> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDto): Promise<Dto> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDto): Promise<Dto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
