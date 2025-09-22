import { IsString, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for creating a Review.
 *
 * Notes:
 *  - `productId` should normally come from the request path or body.
 *  - `userId` is optional here because you may take the user from the authenticated request.
 */
export class CreateReviewDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
