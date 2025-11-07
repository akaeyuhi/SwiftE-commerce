import { useParams } from 'react-router-dom';
import { useOrder } from '../hooks/useOrders';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { OrderHeader } from '../components/details/OrderHeader';
import { OrderItems } from '../components/details/OrderItems';
import { OrderShippingInfo } from '../components/details/OrderShippingInfo';
import { OrderSummary } from '../components/details/OrderSummary';

export function OrderDetailPage() {
  const { orderId, storeId } = useParams<{
    orderId: string;
    storeId: string;
  }>();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrder(storeId!, orderId!, {
    enabled: !!storeId && !!orderId,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
          {order && (
            <>
              <OrderHeader order={order} />
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
