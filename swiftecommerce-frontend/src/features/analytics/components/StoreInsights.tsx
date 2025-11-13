import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Eye, Heart, Package, Users } from 'lucide-react';
import { useStoreInsights } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function StoreInsights({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const {
    data: insights,
    isLoading,
    error,
    refetch,
  } = useStoreInsights(storeId!, { period: timeRange });

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
          error={error}
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
                {insights?.pageViews.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Favorites</span>
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
                <span className="text-sm text-foreground">Return Rate</span>
              </div>
              <span className="font-semibold text-foreground">
                {(insights?.returnRate || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
