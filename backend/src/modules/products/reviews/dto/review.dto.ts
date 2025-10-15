/**
 * Transfer DTO for returning Review objects to clients.
 * Keeps identifiers instead of full nested relations to keep payload small.
 */
export class ReviewDto {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}
