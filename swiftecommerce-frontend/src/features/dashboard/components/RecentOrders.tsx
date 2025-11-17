import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Clock, CheckCircle2, Truck, ShoppingCart } from 'lucide-react';
import { useRecentOrders } from '../hooks/useDashboard';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Order } from '@/features/orders/types/order.types.ts';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'SHIPPED':
      return <Truck className="h-4 w-4 text-info" />;
    default:
      return <Clock className="h-4 w-4 text-warning" />;
  }
};

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <div
      className="flex items-center justify-between p-4 border
      border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {getStatusIcon(order.status)}
        <div>
          <p className="font-medium text-foreground">#{order.id}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-foreground">${order.totalAmount}</p>
        <Badge
          variant={
            order.status === 'delivered'
              ? 'success'
              : order.status === 'shipped'
                ? 'default'
                : 'warning'
          }
          className="text-xs capitalize"
        >
          {order.status.toLowerCase()}
        </Badge>
      </div>
    </div>
  );
}

export function RecentOrders() {
  const navigate = useNavigate();
  const { data: recentOrders, isLoading, error, refetch } = useRecentOrders(3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate.toOrders()}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
          {isLoading ? (
            <SkeletonLoader count={3} height="h-16" />
          ) : !recentOrders || recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              description="Your recent orders will appear here."
            />
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
