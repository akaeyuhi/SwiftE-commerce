import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useTopProducts } from '../hooks/useStores';
import { ErrorState } from '@/shared/components/errors/ErrorState';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { formatCurrency } from '@/shared/utils/statsCalculators';

interface TopProductsProps {
  storeId: string;
}

export function TopProducts({ storeId }: TopProductsProps) {
  const {
    data: topProducts = [],
    isLoading,
    error,
  } = useTopProducts(storeId, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </div>
          <Link
            to={ROUTES.STORE_PRODUCTS}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState
            error={error}
            title="Failed to load products"
            variant="inline"
          />
        ) : isLoading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : topProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No products yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.map((product: any, index: number) => (
              <div
                key={product.id}
                className="flex items-center gap-4 hover:bg-muted/50 p-2
                      rounded transition-colors"
              >
                <div
                  className="h-10 w-10 bg-primary/10 rounded-lg flex
                      items-center justify-center flex-shrink-0"
                >
                  <span className="text-sm font-bold text-primary">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {product.salesCount} sales
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  {formatCurrency(product.revenue, 'USD')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
