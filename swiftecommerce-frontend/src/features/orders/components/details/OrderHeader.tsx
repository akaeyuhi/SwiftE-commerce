import { Order } from '../../types/order.types';
import { OrderStatusBadge } from '../common/OrderStatusBadge';
import { Button } from '@/shared/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '@/shared/hooks/useNavigate';

interface OrderHeaderProps {
  order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps) {
  const navigate = useNavigate();
  return (
    <>
      <Button variant="ghost" onClick={() => navigate.back()} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Order #{order.id.substring(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} className="text-lg px-4 py-2" />
      </div>
    </>
  );
}
