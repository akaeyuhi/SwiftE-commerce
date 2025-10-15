import { IsBoolean, IsDate, IsOptional, IsUUID } from 'class-validator';

export class CreateAdminDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  assignedBy?: string;

  @IsDate()
  @IsOptional()
  assignedAt?: Date;

  @IsBoolean()
  @IsOptional()
  isActive = false;
}
