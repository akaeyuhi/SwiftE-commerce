import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { User } from 'src/entities/user/user.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';

@Injectable()
export class UserMapper extends BaseMapper<User, UserDto> {
  toDto(entity: User): UserDto {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName!,
      lastName: entity.lastName!,
      isEmailVerified: entity.isEmailVerified,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      siteRole: entity.siteRole,
      isActive: entity.isActive,
      deactivatedAt: entity.deactivatedAt,
      emailVerifiedAt: entity.emailVerifiedAt,
    };
  }

  toEntity(dto: Partial<UserDto>): User {
    const user = new User();
    if (dto.id) user.id = dto.id;
    user.email = dto.email ?? user.email;
    user.firstName = dto.firstName ?? user.firstName;
    user.lastName = dto.lastName ?? user.lastName;
    return user;
  }
}
