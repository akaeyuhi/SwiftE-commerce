import { IsString, IsOptional, MinLength } from 'class-validator';
import { User } from 'src/entities/user.entity';

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  ownerUser: User;
}
