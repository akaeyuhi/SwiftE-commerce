import { CreateUserRoleDto } from 'src/modules/user/modules/dto/create-role.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {}
