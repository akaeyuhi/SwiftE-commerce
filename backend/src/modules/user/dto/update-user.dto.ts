import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEnum(AdminRoles)
  siteRole?: AdminRoles;
}

export class UpdateProfileDto {
  @IsNotEmpty()
  @MinLength(3)
  @IsOptional()
  firstName?: string;

  @IsNotEmpty()
  @MinLength(3)
  @IsOptional()
  lastName?: string;
}
