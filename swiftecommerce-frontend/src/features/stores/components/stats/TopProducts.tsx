import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Link } from '@/shared/components/ui/Link';
import { buildRoute } from '@/app/routes/routes';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { ErrorState } from '@/shared/components/errors/ErrorState.tsx';
import { useTopProducts } from '@/features/stores/hooks/useStores.ts';

interface TopProductsProps {
  storeId: string;
}

export function TopProducts({ storeId }: TopProductsProps) {
  const {
    data: topProductsData,
    isLoading,
    error,
  } = useTopProducts(storeId, 8);

  const products = topProductsData!;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </div>
          <Link
            to={buildRoute.storeProducts(storeId)}
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
        ) : products?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No products yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products?.map((product: any, index: number) => (
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
                </div>
                <p className="font-semibold text-foreground">
                  {product.totalSales} sales
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
