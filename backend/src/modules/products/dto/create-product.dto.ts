export class CreateProductDto {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  categoryId?: string;
  createdAt: Date;
  updatedAt: Date;
}
