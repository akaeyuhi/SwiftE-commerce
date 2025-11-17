import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { OrderStatusBadge } from '../common/OrderStatusBadge';
import { Order, OrderStatus } from '../../types/order.types';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useOrderMutations } from '../../hooks/useOrderMutations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface OrderListItemProps {
  order: Order;
  storeId: string;
}

export function OrderListItem({ order, storeId }: OrderListItemProps) {
  const navigate = useNavigate();
  const { updateStatus } = useOrderMutations(storeId);

  const handleUpdateStatus = (newStatus: OrderStatus) => {
    updateStatus.mutate(
      {
        orderId: order.id,
        data: { status: newStatus },
      },
      {
        onSuccess: () => {
          order.status = newStatus;
        },
      }
    );
  };

  return (
    <Card>
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
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-2xl font-bold text-foreground">
              ${parseFloat(String(order.totalAmount))}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {item.productName}
                </p>
                <p className="text-sm text-muted-foreground">
                  SKU: {item.sku} • Qty: {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-foreground">
                ${parseFloat(String(item.lineTotal)).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {order.shipping && (
          <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded">
            <p className="font-medium text-foreground mb-1">Ship to:</p>
            <p>
              {order.shipping.addressLine1}, {order.shipping.addressLine2 ?? ''}
              {order.shipping.city}, {order.shipping.postalCode}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Select
            value={order.status}
            onValueChange={(value) => handleUpdateStatus(value as OrderStatus)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate.toStoreOrder(storeId, order.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
