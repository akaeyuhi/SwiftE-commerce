/**
 * Transfer DTO for returning category data to clients.
 */
export class CategoryDto {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
