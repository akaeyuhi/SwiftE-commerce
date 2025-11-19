import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Package, Truck, CheckCircle2, XCircle } from 'lucide-react';

interface OrderCardProps {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  items: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: Date;
  onView: (id: string) => void;
}

export function OrderCard({
  id,
  orderNumber,
  customer,
  items,
  total,
  status,
  date,
  onView,
}: OrderCardProps) {
  const statusConfig = {
    pending: { icon: Package, color: 'text-warning', bgColor: 'bg-warning/10' },
    processing: {
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    shipped: { icon: Truck, color: 'text-info', bgColor: 'bg-info/10' },
    delivered: {
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    cancelled: { icon: XCircle, color: 'text-error', bgColor: 'bg-error/10' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const getStatusVariant = () => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div
      className="flex items-center justify-between p-4 border
    border-border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`h-12 w-12 ${config.bgColor} rounded-lg flex items-center justify-center`}
        >
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">{orderNumber}</p>
            <Badge variant={getStatusVariant() as any}>{status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {customer.name} • {customer.email}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {date.toLocaleDateString()} • {items} items
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-foreground text-lg">
            ${total.toFixed(2)}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onView(id)}>
          View
        </Button>
      </div>
    </div>
  );
}
