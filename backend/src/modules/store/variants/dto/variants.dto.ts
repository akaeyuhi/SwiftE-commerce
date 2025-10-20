export class VariantDto {
  id: string;
  sku: string;
  price: number;
  attributes?: Record<string, any>;
  inventory: {
    quantity: number;
  };
}
