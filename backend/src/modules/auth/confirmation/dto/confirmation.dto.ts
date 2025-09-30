import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ConfirmationType } from '../enums/confirmation.enum';

export class ConfirmEmailDto {
  @IsString()
  token: string;
}

export class ResendConfirmationDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class AssignRoleDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class CancelRoleAssignmentDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(ConfirmationType)
  confirmationType: ConfirmationType;
}
