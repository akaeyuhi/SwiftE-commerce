import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { UserRole } from 'src/entities/user-role.entity';
import { BaseService } from 'src/common/abstracts/base.service';
import { CreateUserRoleDto } from 'src/modules/user-role/dto/create-role.dto';
import { UpdateUserRoleDto } from 'src/modules/user-role/dto/update-user-role.dto';

@Injectable()
export class UserRoleService extends BaseService<
  UserRole,
  CreateUserRoleDto,
  UpdateUserRoleDto
> {
  constructor(private readonly userRoleRepo: UserRoleRepository) {
    super(userRoleRepo);
  }

  async findByStoreUser(
    userId: string,
    storeId: string
  ): Promise<UserRole | null> {
    return this.userRoleRepo.findOne({
      where: {
        user: {
          id: userId,
        },
        store: {
          id: storeId,
        },
      },
    });
  }

  async update(userId: string, dto: UpdateUserRoleDto): Promise<UserRole> {
    const { store, roleName } = dto;
    const role = await this.findByStoreUser(userId, store!.id);
    if (!role) throw new NotFoundException(`Such role doesnt exist`);
    return await this.userRoleRepo.save({ ...role, roleName });
  }
}
