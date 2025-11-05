import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';

import {
  useStoreOverview,
  useRecentOrders,
} from '@/features/stores/hooks/useStoreOverview';
import {
  useStoreHealth,
  useTopProducts,
} from '@/features/stores/hooks/useStores';

import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';

import { useStatsChange } from '@/shared/hooks/useStatsChange';
import { formatCurrency } from '@/shared/utils/statsCalculators';
import { ErrorState } from '@/shared/components/errors/ErrorState.tsx';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';

interface StoreStats {
  [key: string]: number;
  revenue: number;
  products: number;
  orders: number;
  conversionRate: number;
}

export function StoreOverviewPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  if (!storeId) {
    navigate.to(ROUTES.NOT_FOUND);
  }

  // Fetch data using TanStack Query hooks
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = useStoreOverview(storeId!);

  const {
    data: recentOrders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useRecentOrders(storeId!, 3);

  const {
    data: topProducts = [],
    isLoading: productsLoading,
    error: productsError,
  } = useTopProducts(storeId!, 4);

  const { data: storeHealth, isLoading: healthLoading } = useStoreHealth(
    storeId!
  );

  // Calculate stat changes (mock previous data - in real app fetch from API)
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

  // Build stats from real data with calculated changes
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'success',
      processing: 'default',
      pending: 'warning',
      cancelled: 'error',
    };
    return variants[status] || 'outline';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Store Overview
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats Grid with Query Loader */}
      <QueryLoader
        isLoading={overviewLoading}
        isFetching={overviewFetching}
        error={overviewError}
        refetch={refetchOverview}
        errorTitle="Failed to load statistics"
        loadingMessage="Loading store statistics..."
        showOverlayOnRefetch={true}
      >
        {stats.length > 0 && <StatsGrid stats={stats} />}
      </QueryLoader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest orders from your store</CardDescription>
              </div>
              <Link
                to={ROUTES.STORE_ORDERS}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {ordersError ? (
              <ErrorState
                error={ordersError}
                title="Failed to load orders"
                variant="inline"
              />
            ) : ordersLoading ? (
              <SkeletonLoader variant="card" count={3} />
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-muted/50
                      rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">
                        {order.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {order.productName}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadge(order.status) as any}>
                          {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground ml-4">
                      {formatCurrency(order.amount, 'USD')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </div>
              <Link
                to={ROUTES.STORE_PRODUCTS}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {productsError ? (
              <ErrorState
                error={productsError}
                title="Failed to load products"
                variant="inline"
              />
            ) : productsLoading ? (
              <SkeletonLoader variant="card" count={4} />
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No products yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product: any, index: number) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 hover:bg-muted/50 p-2
                      rounded transition-colors"
                  >
                    <div
                      className="h-10 w-10 bg-primary/10 rounded-lg flex
                      items-center justify-center flex-shrink-0"
                    >
                      <span className="text-sm font-bold text-primary">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.salesCount} sales
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(product.revenue, 'USD')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={ROUTES.STORE_PRODUCTS_CREATE}
              className="flex items-center gap-3 p-4 border border-border
                rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className="h-10 w-10 bg-primary/10 rounded-lg
                flex items-center justify-center"
              >
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Add Product</p>
                <p className="text-sm text-muted-foreground">
                  Create new listing
                </p>
              </div>
            </Link>

            <Link
              to={ROUTES.STORE_ORDERS}
              className="flex items-center gap-3 p-4 border border-border
                rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 bg-info/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Orders</p>
                <p className="text-sm text-muted-foreground">Manage orders</p>
              </div>
            </Link>

            <Link
              to={ROUTES.STORE_ANALYTICS}
              className="flex items-center gap-3 p-4 border border-border
                rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className="h-10 w-10 bg-success/10 rounded-lg
                flex items-center justify-center"
              >
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Analytics</p>
                <p className="text-sm text-muted-foreground">View insights</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Store Health */}
      {healthLoading ? (
        <Card>
          <CardContent className="p-6">
            <SkeletonLoader variant="grid" columns={3} count={3} />
          </CardContent>
        </Card>
      ) : storeHealth ? (
        <Card>
          <CardHeader>
            <CardTitle>Store Health</CardTitle>
            <CardDescription>Current status and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {storeHealth.metrics &&
                Object.entries(storeHealth.metrics).map(
                  ([key, value]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all"
                          style={{
                            width: `${Math.min(
                              typeof value === 'number' ? value : 0,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
            </div>

            {storeHealth.issues && storeHealth.issues.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-medium text-warning mb-3">
                  Issues Detected:
                </p>
                <ul className="space-y-2">
                  {storeHealth.issues.map((issue: string, idx: number) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex gap-2"
                    >
                      <span className="text-warning">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
