import { useState } from 'react';
import { useAuth } from '@/app/store';
import { useUserOrders } from '../hooks/useOrders';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { UserOrderListItem } from '../components/list/UserOrderListItem';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { ShoppingCart } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';

export function OrdersPage() {
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    user?.ownedStores?.[0]?.id
  );

  // API Limitation Workaround:
  // The current `useUserOrders` hook requires a `storeId` to fetch orders.
  // A better approach would be a backend endpoint like `GET /user/orders`
  // that returns all orders for the authenticated user across all stores.
  // As a workaround, we allow the user to select a store to view orders from.
  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useUserOrders(selectedStoreId!, user!.id, {
    enabled: !!selectedStoreId && !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {user?.ownedStores && user.ownedStores.length > 0 ? (
          <Card className="mb-6 p-6">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium">Viewing orders for store:</p>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {user.ownedStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ) : (
          // TODO: This case needs to be handled. If a user is just a customer
          // and not a store owner, we cannot fetch their orders with the current API.
          <EmptyState
            icon={ShoppingCart}
            title="No stores found"
            description="We can't display your orders right
            now because the API requires a store context."
          />
        )}

        <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <UserOrderListItem key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={ShoppingCart}
                title="No orders found"
                description="You haven't placed any orders in this store yet."
              />
            </Card>
          )}
        </QueryLoader>
      </div>
    </div>
  );
}
