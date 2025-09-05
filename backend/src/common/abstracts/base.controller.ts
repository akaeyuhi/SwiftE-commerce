import { Body, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BaseService } from './base.service';
import { ObjectLiteral } from 'typeorm';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export abstract class BaseController<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
> {
  static accessPolicies: AccessPolicies | null = null;
  protected constructor(
    protected readonly service: BaseService<
      Entity,
      CreateDto,
      UpdateDto,
      TransferDto
    >
  ) {}

  @Get()
  findAll(): Promise<Entity[] | TransferDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Entity | TransferDto> {
    return this.service.findOne(id);
  }

  @Post()
  @AdminRole(AdminRoles.ADMIN)
  create(@Body() dto: CreateDto): Promise<Entity | TransferDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  @AdminRole(AdminRoles.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDto
  ): Promise<Entity | TransferDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @AdminRole(AdminRoles.ADMIN)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
