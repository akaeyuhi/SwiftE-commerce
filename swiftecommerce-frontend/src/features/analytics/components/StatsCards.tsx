import { TrendingUp, DollarSign, ShoppingCart, Eye } from 'lucide-react';
import { StatItem, StatsGrid } from '@/shared/components/ui/StatsGrid';
import { useConversionMetrics } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useMemo } from 'react';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function StatsCards({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const { data, isLoading, error, refetch } = useConversionMetrics(
    storeId!,
    timeRange
  );

  const stats = useMemo<StatItem[]>(() => {
    if (!data) return [];
    return [
      {
        title: 'Total Revenue',
        value: `$${(data.revenue || 0).toFixed(2)}`,
        change: '+0%',
        trend: 'neutral',
        icon: DollarSign,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        title: 'Purchases',
        value: data.purchases?.toLocaleString() || '0',
        change: '+0%',
        trend: 'neutral',
        icon: ShoppingCart,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Views',
        value: data.views?.toLocaleString() || '0',
        change: '+0%',
        trend: 'neutral',
        icon: Eye,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Conversion Rate',
        value: `${(data.conversionRate * 100 || 0).toFixed(2)}%`,
        change: '+0%',
        trend: 'neutral',
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
