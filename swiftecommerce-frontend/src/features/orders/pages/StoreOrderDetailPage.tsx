import { useParams } from 'react-router-dom';
import { useOrder } from '../hooks/useOrders';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { OrderHeader } from '../components/details/OrderHeader';
import { OrderItems } from '../components/details/OrderItems';
import { OrderShippingInfo } from '../components/details/OrderShippingInfo';
import { OrderSummary } from '../components/details/OrderSummary';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useOrderMutations } from '../hooks/useOrderMutations';
import { OrderStatus } from '../types/order.types';

export function StoreOrderDetailPage() {
  const { orderId, storeId } = useParams<{
    orderId: string;
    storeId: string;
  }>();
  const { updateStatus } = useOrderMutations(storeId);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrder(storeId!, orderId!, {
    enabled: !!storeId && !!orderId,
  });

  const handleUpdateStatus = (newStatus: OrderStatus) => {
    updateStatus.mutate({
      orderId: orderId!,
      data: { orderStatus: newStatus },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
          {order && (
            <>
              <OrderHeader order={order} />
              <div className="mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Order</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        handleUpdateStatus(value as OrderStatus)
                      }
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
                    <Button variant="outline">Print Invoice</Button>
                  </CardContent>
                </Card>
              </div>
              <OrderItems items={order.items} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {order.shipping && (
                  <OrderShippingInfo shipping={order.shipping} />
                )}
                <OrderSummary order={order} />
              </div>
            </>
          )}
        </QueryLoader>
      </div>
    </div>
  );
}
