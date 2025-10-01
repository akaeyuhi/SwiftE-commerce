import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from 'src/modules/admin/dto/create-admin.dto';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsUUID()
  @IsOptional()
  revokedBy?: string;
  @IsDate()
  @IsOptional()
  revokedAt?: Date;
}
