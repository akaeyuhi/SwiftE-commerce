import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { User } from 'src/entities/user.entity';
import { UserDto } from 'src/modules/users/dto/user.dto';

@Injectable()
export class UsersMapper extends BaseMapper<User, UserDto> {
  toDto(entity: User): UserDto {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName!,
      lastName: entity.lastName!,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toEntity(dto: Partial<UserDto>): User {
    const user = new User();
    if (dto.id) user.id = dto.id;
    user.email = dto.email!;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    return user;
  }
}
