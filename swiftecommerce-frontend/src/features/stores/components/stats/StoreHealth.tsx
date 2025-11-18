import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { useStoreHealth } from '@/features/stores/hooks/useStores';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { HealthMetric } from '@/features/stores/types/store-health.types.ts';

interface StoreHealthProps {
  storeId: string;
}

export function StoreHealth({ storeId }: StoreHealthProps) {
  const { data: response, isLoading } = useStoreHealth(storeId);
  const storeHealth = response!;

  const getMetricLabel = (key: string) =>
    key
      .replace(/Count$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Store Health</CardTitle>
            <CardDescription className="mt-2">
              Cached vs actual metrics comparison
            </CardDescription>
          </div>
          {storeHealth?.needsRecalculation && (
            <Badge variant="warning" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Needs Recalculation
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <SkeletonLoader variant="grid" columns={3} count={3} />
        ) : storeHealth?.health ? (
          <div className="space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(storeHealth.health).map(([key, metric]) => (
                <HealthMetricCard
                  key={key}
                  label={getMetricLabel(key)}
                  metric={metric}
                />
              ))}
            </div>

            {/* Issues Section */}
            {storeHealth.needsRecalculation && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Cache Synchronization Required
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Some metrics show discrepancies between cached and actual
                      values. Consider running a cache recalculation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No health data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthMetricCard({
  label,
  metric,
}: {
  label: string;
  metric: HealthMetric;
}) {
  const difference = metric.actual - metric.cached;
  const percentDiff =
    metric.cached !== 0 ? Math.abs((difference / metric.cached) * 100) : 0;

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      {/* Header with label and status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {metric.match ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
      </div>

      {/* Values Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Cached</span>
          <span className="text-lg font-bold text-foreground">
            {metric.cached}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Actual</span>
          <span className="text-lg font-bold text-foreground">
            {metric.actual}
          </span>
        </div>
      </div>

      {/* Difference Indicator */}
      {!metric.match && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Difference</span>
            <div className="flex items-center gap-1">
              {difference > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  difference > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {difference > 0 ? '+' : ''}
                {difference} ({percentDiff.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Bar */}
      <div className="mt-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              metric.match ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{
              width: `${Math.min((metric.actual / Math.max(metric.actual, metric.cached, 1)) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
