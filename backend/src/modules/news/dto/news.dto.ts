/**
 * Transfer DTO used to return NewsPost objects to clients.
 */
export class NewsPostDto {
  id: string;
  storeId?: string | null;
  authorId: string;
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
