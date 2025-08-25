import { Body, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { BaseService } from './base.service';

export abstract class BaseController<
  Entity,
  CreateDto,
  UpdateDto,
  TransferDto,
> {
  protected constructor(
    protected readonly service: BaseService<
      Entity,
      CreateDto,
      UpdateDto,
      TransferDto
    >
  ) {}

  @Get()
  findAll(): Promise<TransferDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TransferDto> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDto): Promise<TransferDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDto
  ): Promise<TransferDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
