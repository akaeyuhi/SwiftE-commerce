import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Eye, Heart, Package, Users } from 'lucide-react';
import {
  useStoreQuickStats,
  useConversionMetrics,
} from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';
import { useMemo } from 'react';

export function StoreInsights({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();

  const quickStatsQuery = useStoreQuickStats(storeId!);
  const conversionMetricsQuery = useConversionMetrics(storeId!, timeRange);

  const isLoading =
    quickStatsQuery.isLoading || conversionMetricsQuery.isLoading;
  const error = quickStatsQuery.error || conversionMetricsQuery.error;
  const refetch = () => {
    quickStatsQuery.refetch();
    conversionMetricsQuery.refetch();
  };

  const insights = useMemo(() => {
    if (!quickStatsQuery.data || !conversionMetricsQuery.data) return null;
    return {
      views: conversionMetricsQuery.data.views,
      favorites: quickStatsQuery.data.followerCount, // Assuming favorites are followers
      avgOrderValue: quickStatsQuery.data.averageOrderValue,
      checkoutRate: conversionMetricsQuery.data.checkoutRate,
    };
  }, [quickStatsQuery.data, conversionMetricsQuery.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Insights</CardTitle>
        <CardDescription>
          Key metrics and performance indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoader
          isLoading={isLoading}
          error={error as Error | null}
          refetch={refetch}
          loadingMessage="Loading store insights..."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Page Views</span>
              </div>
              <span className="font-semibold text-foreground">
                {insights?.views.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Followers</span>
              </div>
              <span className="font-semibold text-foreground">
                {insights?.favorites.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  Avg. Order Value
                </span>
              </div>
              <span className="font-semibold text-foreground">
                ${(insights?.avgOrderValue || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Checkout Rate</span>
              </div>
              <span className="font-semibold text-foreground">
                {(insights?.checkoutRate * 100 || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
