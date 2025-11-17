import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { useMemo } from 'react';
import { useStatsChange } from '@/shared/hooks/useStatsChange';
import { formatCurrency } from '@/shared/utils/statsCalculators';
import { DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { StoreOverviewDto } from '@/features/stores/types/store.types.ts';

interface StoreStatsGridProps {
  overviewData: StoreOverviewDto;
}

interface StoreStats {
  [key: string]: number;
  revenue: number;
  products: number;
  orders: number;
  conversionRate: number;
}

export function StoreStatsGrid({ overviewData }: StoreStatsGridProps) {
  const previousStats: StoreStats = {
    revenue: overviewData?.stats.totalRevenue
      ? overviewData.stats.totalRevenue * 0.75
      : 0,
    products: Math.max((overviewData?.stats.productCount ?? 0) - 4, 0),
    orders: Math.max((overviewData?.stats.orderCount ?? 0) - 20, 0),
    conversionRate: (overviewData?.stats.conversionRate ?? 0) * 0.8,
  };

  const currentStats: StoreStats = useMemo(
    () => ({
      revenue: overviewData?.stats.totalRevenue ?? 0,
      products: overviewData?.stats.productCount ?? 0,
      orders: overviewData?.stats.orderCount ?? 0,
      conversionRate: overviewData?.stats.conversionRate ?? 0,
    }),
    [overviewData?.stats]
  );

  const statChanges = useStatsChange(currentStats, previousStats, {
    currency: {
      revenue: true,
      products: false,
      orders: false,
      conversionRate: false,
    },
    decimals: 2,
  });

  const stats = useMemo(() => {
    if (!overviewData) return [];

    return [
      {
        title: 'Total Revenue',
        value: formatCurrency(currentStats.revenue, 'USD'),
        change: statChanges.revenue?.formattedChange ?? '+0',
        trend: statChanges.revenue?.trend ?? 'neutral',
        icon: DollarSign,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        title: 'Products',
        value: currentStats.products.toString(),
        change: statChanges.products?.formattedChange ?? '+0',
        trend: statChanges.products?.trend ?? 'neutral',
        icon: Package,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Orders',
        value: currentStats.orders.toString(),
        change: statChanges.orders?.formattedChange ?? '+0',
        trend: statChanges.orders?.trend ?? 'neutral',
        icon: ShoppingCart,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Conversion Rate',
        value: `${(currentStats.conversionRate * 100).toFixed(2)}%`,
        change: statChanges.conversionRate?.formattedChangePercentage ?? '0%',
        trend: statChanges.conversionRate?.trend ?? 'neutral',
        icon: TrendingUp,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
    ];
  }, [overviewData, currentStats, statChanges]);

  return <StatsGrid stats={stats} />;
}
