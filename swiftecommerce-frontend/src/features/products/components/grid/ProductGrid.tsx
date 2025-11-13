import { ProductPublicCard } from '../card/ProductPublicCard';
import { Product } from '../types/product.types';
import { Card } from '@/shared/components/ui/Card';
import { Package } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try adjusting your filters or search query"
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductPublicCard product={product} key={product.id} />
      ))}
    </div>
  );
}
