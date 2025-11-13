import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useOrders } from '../hooks/useOrders';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { OrderStats } from '../components/common/OrderStats';
import { OrderFilters } from '../components/common/OrderFilters';
import { OrderList } from '../components/list/OrderList';

export function StoreOrdersPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useOrders(storeId!, {
    search: debouncedSearch,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const orders = ordersData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Orders Management
        </h1>
        <p className="text-muted-foreground">
          Manage and fulfill customer orders
        </p>
      </div>

      <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
        <OrderStats orders={orders} />

        <OrderFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          status={filterStatus}
          onStatusChange={setFilterStatus}
        />

        <OrderList
          orders={orders}
          storeId={storeId!}
          emptyStateProps={{
            title: 'No orders found',
            description:
              searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'No orders yet',
          }}
        />
      </QueryLoader>
    </div>
  );
}
