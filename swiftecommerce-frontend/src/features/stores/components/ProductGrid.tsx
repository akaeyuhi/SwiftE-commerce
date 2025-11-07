import { ProductPublicCard } from '@/features/products/components/ProductPublicCard';
import { ProductListDto } from '@/features/products/types/product.types';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: ProductListDto[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Card className="mb-12">
        <CardContent className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or search query
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
      {products.map((product) => (
        <ProductPublicCard product={product} key={product.id} />
      ))}
    </div>
  );
}
