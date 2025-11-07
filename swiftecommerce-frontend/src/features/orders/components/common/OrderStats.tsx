import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Order } from '@/features/orders/types/order.types';
import { ShoppingCart, Package, CheckCircle2, DollarSign } from 'lucide-react';
import { useMemo } from 'react';

interface OrderStatsProps {
  orders: Order[];
}

export function OrderStats({ orders }: OrderStatsProps) {
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const deliveredOrders = orders.filter(
      (o) => o.status === 'delivered'
    ).length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return [
      {
        title: 'Total Orders',
        value: totalOrders,
        icon: ShoppingCart,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Pending',
        value: pendingOrders,
        icon: Package,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
      {
        title: 'Delivered',
        value: deliveredOrders,
        icon: CheckCircle2,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        title: 'Total Revenue',
        value: `$${totalRevenue.toFixed(2)}`,
        icon: DollarSign,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
    ];
  }, [orders]);

  return <StatsGrid stats={stats} columns={4} />;
}
