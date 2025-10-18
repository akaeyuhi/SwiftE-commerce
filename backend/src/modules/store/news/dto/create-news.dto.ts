import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a NewsPost.
 *
 * - `storeId` is optional (posts may be global).
 * - `authorId` can be taken from the authenticated user instead of the request body.
 */
export class CreateNewsDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  // optional: author is usually from request.user
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
