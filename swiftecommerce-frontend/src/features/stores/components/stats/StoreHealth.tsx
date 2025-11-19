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
  XCircle,
  Package,
  ShoppingCart,
  DollarSign,
  Grid3x3,
  FolderTree,
} from 'lucide-react';

interface StoreHealthProps {
  storeId: string;
}

interface HealthMetric {
  cached: number;
  actual: number;
  match: boolean;
  difference: number;
}

export function StoreHealth({ storeId }: StoreHealthProps) {
  const { data: storeHealth, isLoading } = useStoreHealth(storeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'GOOD':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'WARNING':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMetricIcon = (key: string) => {
    switch (key) {
      case 'productCount':
        return Package;
      case 'orderCount':
        return ShoppingCart;
      case 'totalRevenue':
        return DollarSign;
      case 'variantCount':
        return Grid3x3;
      case 'categoryCount':
        return FolderTree;
      default:
        return Package;
    }
  };

  const formatValue = (key: string, value: number) => {
    if (key === 'totalRevenue') {
      return `$${value.toFixed(2)}`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle>Store Health Check</CardTitle>
            <CardDescription>
              Data integrity and cache synchronization status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {storeHealth && (
              <Badge
                className={getStatusColor(storeHealth.healthStatus)}
                variant="outline"
              >
                {storeHealth.healthStatus} ({storeHealth.healthScore}%)
              </Badge>
            )}
            {storeHealth?.needsRecalculation && (
              <Badge variant="error" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Needs Sync
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <SkeletonLoader variant="grid" columns={3} count={3} />
        ) : storeHealth ? (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(storeHealth.metrics).map(([key, metric]) => {
                const Icon = getMetricIcon(key);
                return (
                  <HealthMetricCard
                    key={key}
                    label={key
                      .replace(/Count$/, '')
                      .replace(/([A-Z])/g, ' $1')
                      .trim()
                      .split(' ')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                    metric={metric as HealthMetric}
                    icon={Icon}
                    formatter={(val) => formatValue(key, val)}
                  />
                );
              })}
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {/* Products */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium text-foreground">
                      {storeHealth.products.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg variants:</span>
                    <span className="font-medium text-foreground">
                      {storeHealth.products.avgVariantsPerProduct}
                    </span>
                  </div>
                  {storeHealth.products.withoutVariants > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Without variants:</span>
                      <span className="font-medium">
                        {storeHealth.products.withoutVariants}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Categories
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium text-foreground">
                      {storeHealth.categories.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className="font-medium text-foreground">
                      {storeHealth.categories.utilizationPercentage}%
                    </span>
                  </div>
                  {storeHealth.categories.empty > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Empty:</span>
                      <span className="font-medium">
                        {storeHealth.categories.empty}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium text-foreground">
                      {storeHealth.orders.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium text-foreground">
                      ${storeHealth.orders.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg order:</span>
                    <span className="font-medium text-foreground">
                      ${storeHealth.orders.avgOrderValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {storeHealth.recommendations.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium text-foreground">
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {storeHealth.recommendations.map(
                    (rec: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          rec.type === 'CRITICAL'
                            ? 'bg-red-500/5 border-red-500/20'
                            : rec.type === 'WARNING'
                              ? 'bg-yellow-500/5 border-yellow-500/20'
                              : 'bg-blue-500/5 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {rec.type === 'CRITICAL' ? (
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{rec.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
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
  icon: Icon,
  formatter = (val) => val.toString(),
}: {
  label: string;
  metric: HealthMetric;
  icon: React.ComponentType<{ className?: string }>;
  formatter?: (val: number) => string;
}) {
  const difference = metric.difference;
  const percentDiff =
    metric.cached !== 0 ? Math.abs((difference / metric.cached) * 100) : 0;

  return (
    <div className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        {metric.match ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Cached</span>
          <span className="text-lg font-bold text-foreground">
            {formatter(metric.cached)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Actual</span>
          <span className="text-lg font-bold text-foreground">
            {formatter(metric.actual)}
          </span>
        </div>
      </div>

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
                {formatter(Math.abs(difference))} ({percentDiff.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

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
