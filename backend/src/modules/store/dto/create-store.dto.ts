import { IsString, IsOptional, MinLength, IsUUID } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsUUID()
  @IsOptional()
  ownerId: string;
}
