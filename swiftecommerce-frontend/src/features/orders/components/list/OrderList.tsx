import { Order } from '../../types/order.types';
import { OrderListItem } from './OrderListItem';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ShoppingCart } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  storeId: string;
  emptyStateProps: {
    title: string;
    description: string;
  };
}

export function OrderList({
  orders,
  storeId,
  emptyStateProps,
}: OrderListProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title={emptyStateProps.title}
        description={emptyStateProps.description}
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderListItem key={order.id} order={order} storeId={storeId} />
      ))}
    </div>
  );
}
