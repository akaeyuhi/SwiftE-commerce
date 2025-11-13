import { Badge, BadgeProps } from '@/shared/components/ui/Badge';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Archive,
} from 'lucide-react';
import { OrderStatus } from '@/features/orders/types/order.types';

interface OrderStatusBadgeProps extends BadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  {
    icon: React.ElementType;
    label: string;
    variant: BadgeProps['variant'];
  }
> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    variant: 'warning',
  },
  paid: {
    icon: Package,
    label: 'Paid',
    variant: 'default',
  },
  processing: {
    icon: RefreshCw,
    label: 'Processing',
    variant: 'default',
  },
  shipped: {
    icon: Truck,
    label: 'Shipped',
    variant: 'secondary',
  },
  delivered: {
    icon: CheckCircle2,
    label: 'Delivered',
    variant: 'success',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    variant: 'error',
  },
  returned: {
    icon: Archive,
    label: 'Returned',
    variant: 'outline',
  },
  refunded: {
    icon: Archive,
    label: 'Refunded',
    variant: 'outline',
  },
};

export function OrderStatusBadge({ status, ...props }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} {...props}>
      <Icon className="h-3 w-3 mr-1.5" />
      {config.label}
    </Badge>
  );
}
