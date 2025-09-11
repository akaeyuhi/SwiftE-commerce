import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
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
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
