import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ShoppingCart,
  Heart,
  Store,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { mockOrders } from '@/shared/mocks/orders.mock';
import { mockStores } from '@/shared/mocks/stores.mock';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'My Orders',
      value: mockOrders.length.toString(),
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Wishlist',
      value: '12',
      icon: Heart,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    {
      title: 'My Stores',
      value: mockStores.length.toString(),
      icon: Store,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Reviews',
      value: '8',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const recentOrders = mockOrders.slice(0, 3);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-info" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here&#39;s what&#39;s happening with your account
          </p>
        </div>

        {/* Stats */}
        <StatsGrid stats={stats} columns={4} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate.toProducts()}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 bg-primary/10 rounded-lg
                flex items-center justify-center"
                >
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Browse Products
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Discover new items
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate.toMyStores()}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Stores</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your stores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate.toOrders()}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 bg-success/10
                rounded-lg flex items-center justify-center"
                >
                  <ShoppingCart className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your purchases
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & My Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate.toOrders()}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border
                      border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="font-medium text-foreground">
                            {order.orderNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          ${order.total.toFixed(2)}
                        </p>
                        <Badge
                          variant={
                            order.status === 'delivered'
                              ? 'success'
                              : order.status === 'shipped'
                                ? 'default'
                                : 'warning'
                          }
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Stores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Stores</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate.toMyStores()}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mockStores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don&#39;t have any stores yet
                  </p>
                  <Button onClick={() => navigate.toCreateStore()}>
                    Create Store
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockStores.map((store) => (
                    <div
                      key={store.id}
                      className="flex items-center gap-4 p-4 border border-border
                      rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate.toStoreOverview(store.id)}
                    >
                      <div
                        className="h-12 w-12 bg-primary/10 rounded-lg flex
                      items-center justify-center"
                      >
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {store.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {store.totalProducts} products
                        </p>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
