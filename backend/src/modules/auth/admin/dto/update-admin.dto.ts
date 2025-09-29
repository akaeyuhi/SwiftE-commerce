import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from 'src/modules/auth/admin/dto/create-admin.dto';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}
