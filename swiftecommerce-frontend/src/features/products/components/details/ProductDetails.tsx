import { Card, CardContent } from '@/shared/components/ui/Card';
import { ProductVariant } from '@/features/products/types/variant.types.ts';
import { Product } from '@/features/products/types/product.types.ts';

interface ProductDetailsProps {
  product: Product;
  selectedVariant?: ProductVariant;
}

export function ProductDetails({
  product,
  selectedVariant,
}: ProductDetailsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Product Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono text-foreground">
              {selectedVariant?.sku}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Categories</span>
            <span className="text-foreground">
              {product.categories?.map((c) => c.name).join(', ')}
            </span>
          </div>
          {selectedVariant?.attributes &&
            Object.entries(selectedVariant.attributes).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between py-2 border-b border-border"
              >
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="text-foreground">{String(value)}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
