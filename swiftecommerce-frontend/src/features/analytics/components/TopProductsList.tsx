import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { useTopProductsByConversion } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function TopProductsList({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const {
    data: topProducts,
    isLoading,
    error,
    refetch,
  } = useTopProductsByConversion(storeId!, { period: timeRange });

  console.log(topProducts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
        <CardDescription>
          Best performing products this period by conversion rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading top products..."
        >
          <div className="space-y-4">
            {topProducts?.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-4">
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
                    {product.sales} sales
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${product.revenue.toFixed(2)}
                  </p>
                  <p
                    className={`text-xs ${
                      product.conversionRate >= 0
                        ? 'text-success'
                        : 'text-error'
                    }`}
                  >
                    {product.conversionRate.toFixed(2)}% conv.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
