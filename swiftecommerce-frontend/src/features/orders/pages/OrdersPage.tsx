import { useAuth } from '@/app/store';
import { useMyOrders } from '../hooks/useOrders';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { UserOrderListItem } from '../components/list/UserOrderListItem';
import { ShoppingCart } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import { Order } from '../types/order.types';

export function OrdersPage() {
  const { user } = useAuth();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMyOrders({
    enabled: !!user,
  });

  const orders = data?.pages || [];

  const lastOrderRef = useInfiniteScroll({
    isLoading: isFetchingNextPage,
    hasNextPage,
    callback: fetchNextPage,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        <QueryLoader isLoading={isLoading} error={error as Error}>
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order: Order, index: number) => (
                <UserOrderListItem
                  key={order.id}
                  order={order}
                  ref={index === orders.length - 1 ? lastOrderRef : null}
                />
              ))}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <div
                    className="animate-spin h-8 w-8 border-4 border-primary
                  border-t-transparent rounded-full"
                  />
                  <p className="ml-3 text-muted-foreground">
                    Loading more orders...
                  </p>
                </div>
              )}
              {!hasNextPage && orders.length > 0 && (
                <p className="text-center text-muted-foreground mt-4">
                  You&#39;ve reached the end of your order history.
                </p>
              )}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={ShoppingCart}
                title="No orders found"
                description="You haven't placed any orders yet."
              />
            </Card>
          )}
        </QueryLoader>
      </div>
    </div>
  );
}
