export interface CreateProductDto {
  id?: string;

  name: string;

  description?: string;

  storeId: string;

  /**
   * Optional category id (UUID) to assign product to a category.
   */
  categoryIds?: string[];

  categoryId?: string;

  photos?: File[];
  mainPhoto?: File;

  variants: CreateVariantDto[];
}

export interface CreateVariantDto {
  price: number;
  sku?: string;
  attributes?: Record<string, any>;
  stock?: number;
  initialQuantity?: number;
}

export type UpdateVariantDto = Partial<CreateVariantDto>;
export type UpdateProductDto = Partial<CreateProductDto> & {
  updateVariants?: UpdateVariantDto[];
};
