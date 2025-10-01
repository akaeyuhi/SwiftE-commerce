import { IsBoolean, IsDate, IsOptional, IsUUID } from 'class-validator';

export class CreateAdminDto {
  @IsUUID()
  userId: string;
  @IsUUID()
  assignedByUser?: string;
  @IsDate()
  @IsOptional()
  assignedAt?: Date;
  @IsBoolean()
  isActive: boolean;
}
