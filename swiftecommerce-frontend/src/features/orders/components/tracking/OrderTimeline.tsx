import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { Order } from '../../types/order.types';

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const getStatusTimeline = () => [
    {
      status: 'pending',
      label: 'Order Placed',
      date: order.createdAt,
      icon: CheckCircle2,
      isComplete: true,
    },
    {
      status: 'processing',
      label: 'Processing',
      date: null,
      icon: Package,
      isComplete: ['processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'shipped',
      label: 'Shipped',
      date: null, // TODO: Get from order.shipping.shippedAt
      icon: Truck,
      isComplete: ['shipped', 'delivered'].includes(order.status),
    },
    {
      status: 'delivered',
      label: 'Delivered',
      date: null, // TODO: Get from order.shipping.deliveredAt
      icon: CheckCircle2,
      isComplete: order.status === 'delivered',
    },
  ];

  const timeline = getStatusTimeline();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order #{order.id.substring(0, 8)}</CardTitle>
          <Badge variant={order.status === 'delivered' ? 'success' : 'default'}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Ordered on {new Date(order.createdAt).toLocaleDateString()}
          </p>
          <p className="font-semibold text-foreground">{order.store.name}</p>
        </div>

        <div className="space-y-4">
          {timeline.map((item, index) => (
            <div key={item.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    item.isComplete ? 'bg-success/20' : 'bg-muted'
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${
                      item.isComplete ? 'text-success' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                {index < timeline.length - 1 &&
                  item.isComplete &&
                  timeline[index + 1]?.isComplete && (
                    <div className="w-0.5 h-12 bg-border" />
                  )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.label}</p>
                {item.date && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.date).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
