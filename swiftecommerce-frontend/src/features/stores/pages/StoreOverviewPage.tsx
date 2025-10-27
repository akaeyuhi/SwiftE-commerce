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
import { StatsGrid } from '@/shared/components/ui/StatsGrid.tsx';

export function StoreOverviewPage() {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Products',
      value: '24',
      change: '+4',
      trend: 'up' as const,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Orders',
      value: '156',
      change: '+12.5%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Conversion Rate',
      value: '3.2%',
      change: '-0.4%',
      trend: 'down' as const,
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const recentOrders = [
    {
      id: '1',
      customer: 'John Doe',
      product: 'Wireless Headphones',
      amount: '$129.99',
      status: 'completed',
      date: '2 hours ago',
    },
    {
      id: '2',
      customer: 'Jane Smith',
      product: 'Smart Watch',
      amount: '$299.99',
      status: 'processing',
      date: '5 hours ago',
    },
    {
      id: '3',
      customer: 'Mike Johnson',
      product: 'Laptop Stand',
      amount: '$49.99',
      status: 'pending',
      date: '1 day ago',
    },
  ];

  const topProducts = [
    { name: 'Wireless Headphones', sales: 45, revenue: '$5,850' },
    { name: 'Smart Watch', sales: 32, revenue: '$9,600' },
    { name: 'USB-C Cable', sales: 89, revenue: '$890' },
    { name: 'Phone Case', sales: 67, revenue: '$1,340' },
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'success',
      processing: 'default',
      pending: 'warning',
      cancelled: 'error',
    };
    return variants[status as keyof typeof variants] || 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Store Overview
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here&#39;s what&#39;s happening with your store today.
        </p>
      </div>

      <StatsGrid stats={stats} />

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
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">
                      {order.customer}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.product}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(order.status) as any}>
                        {order.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {order.date}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground ml-4">
                    {order.amount}
                  </p>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 bg-primary/10 rounded-lg
                  flex items-center justify-center flex-shrink-0"
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
                      {product.sales} sales
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {product.revenue}
                  </p>
                </div>
              ))}
            </div>
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
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
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
              <div className="h-10 w-10 bg-success/10 rounded-lg flex items-center justify-center">
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
      <Card>
        <CardHeader>
          <CardTitle>Store Health</CardTitle>
          <CardDescription>Current status and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Products
                </span>
                <span className="text-sm font-medium text-foreground">
                  24/30
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: '80%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Order Fulfillment
                </span>
                <span className="text-sm font-medium text-foreground">95%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: '95%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Customer Satisfaction
                </span>
                <span className="text-sm font-medium text-foreground">
                  4.8/5
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: '96%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
