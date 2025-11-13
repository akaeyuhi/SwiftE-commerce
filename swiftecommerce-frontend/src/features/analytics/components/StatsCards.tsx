import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { StatItem, StatsGrid } from '@/shared/components/ui/StatsGrid';
import { useStoreQuickStats } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useMemo } from 'react';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function StatsCards({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const { data, isLoading, error, refetch } = useStoreQuickStats(
    storeId!,
    timeRange
  );

  const stats = useMemo<StatItem[]>(() => {
    if (!data) return [];
    return [
      {
        title: 'Total Revenue',
        value: `$${(data.totalRevenue || 0).toFixed(2)}`,
        change: `${data.revenueChange >= 0 ? '+' : ''}${data.revenueChange.toFixed(1)}%`,
        trend: data.revenueChange >= 0 ? 'up' : 'down',
        icon: DollarSign,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        title: 'Total Orders',
        value: data.totalOrders,
        change: `${data.ordersChange >= 0 ? '+' : ''}${data.ordersChange.toFixed(1)}%`,
        trend: data.ordersChange >= 0 ? 'up' : 'down',
        icon: ShoppingCart,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Customers',
        value: data.totalCustomers,
        change: `${data.customersChange >= 0 ? '+' : ''}${data.customersChange.toFixed(1)}%`,
        trend: data.customersChange >= 0 ? 'up' : 'down',
        icon: Users,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Conversion Rate',
        value: `${(data.conversionRate || 0).toFixed(2)}%`,
        change: `${data.conversionChange >= 0 ? '+' : ''}${data.conversionChange.toFixed(1)}%`,
        trend: data.conversionChange >= 0 ? 'up' : 'down',
        icon: TrendingUp,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
    ];
  }, [data]);

  return (
    <QueryLoader
      isLoading={isLoading}
      error={error}
      refetch={refetch}
      loadingMessage="Loading key metrics..."
    >
      <StatsGrid stats={stats} />
    </QueryLoader>
  );
}
