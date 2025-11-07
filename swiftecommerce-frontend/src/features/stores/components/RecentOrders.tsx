import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useRecentOrders } from '../hooks/useStoreOverview';
import { ErrorState } from '@/shared/components/errors/ErrorState';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { Badge } from '@/shared/components/ui/Badge';
import { formatCurrency } from '@/shared/utils/statsCalculators';

interface RecentOrdersProps {
  storeId: string;
}

export function RecentOrders({ storeId }: RecentOrdersProps) {
  const {
    data: recentOrders = [],
    isLoading,
    error,
  } = useRecentOrders(storeId, 3);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'success',
      processing: 'default',
      pending: 'warning',
      cancelled: 'error',
    };
    return variants[status] || 'outline';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your store</CardDescription>
          </div>
          <Link
            to={ROUTES.STORE_ORDERS}
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
            title="Failed to load orders"
            variant="inline"
          />
        ) : isLoading ? (
          <SkeletonLoader variant="card" count={3} />
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-muted/50
                      rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">
                    {order.customerName}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {order.productName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadge(order.status) as any}>
                      {order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-foreground ml-4">
                  {formatCurrency(order.amount, 'USD')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
