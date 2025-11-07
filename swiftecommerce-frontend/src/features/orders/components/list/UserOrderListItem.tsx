import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { OrderStatusBadge } from '../common/OrderStatusBadge';
import { Order } from '../../types/order.types';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Package } from 'lucide-react';
import React from 'react';

interface UserOrderListItemProps {
  order: Order;
}

export const UserOrderListItem = React.forwardRef<
  HTMLDivElement,
  UserOrderListItemProps
>(({ order }, ref) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow" ref={ref}>
      <CardContent className="p-6">
        <div
          className="flex flex-col md:flex-row md:items-center
        justify-between mb-4 pb-4 border-b border-border"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-foreground text-lg">
                Order #{order.id.substring(0, 8)}
              </h3>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {order.store.name} •{' '}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-2xl font-bold text-foreground">
              ${order.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div
                className="h-16 w-16 bg-muted rounded
              flex items-center justify-center flex-shrink-0"
              >
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {item.productName}
                </p>
                <p className="text-sm text-muted-foreground">
                  SKU: {item.sku} • Qty: {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-foreground">
                ${item.lineTotal.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate.toOrder(order.store.id, order.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
