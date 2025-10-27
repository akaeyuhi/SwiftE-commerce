import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useAuth } from '@/app/store';
import {
  Store as StoreIcon,
  Plus,
  Settings,
  BarChart3,
  Package,
  Users,
  Eye,
  Crown,
  Shield,
} from 'lucide-react';

export function MyStoresPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock data - in production, fetch from API
  const ownedStores = user?.ownedStores || [];
  const storeRoles = user?.roles?.filter((role) => role.isActive) || [];

  // Combine owned stores and stores where user has a role
  const allStores = [
    ...ownedStores.map((store) => ({
      ...store,
      accessType: 'owner' as const,
      role: 'OWNER' as const,
    })),
    ...storeRoles.map((role) => ({
      ...role.store,
      accessType: 'team' as const,
      role: role.roleName,
    })),
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4" />;
      case 'STORE_ADMIN':
        return <Shield className="h-4 w-4" />;
      case 'STORE_MODERATOR':
        return <Users className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'STORE_ADMIN':
        return 'default';
      case 'STORE_MODERATOR':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Stores
            </h1>
            <p className="text-muted-foreground">
              Manage your stores and team access
            </p>
          </div>
          <Button onClick={() => navigate.toCreateStore()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Store
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 bg-primary/10
                rounded-lg flex items-center justify-center"
                >
                  <StoreIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {ownedStores.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Owned Stores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {storeRoles.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Team Member</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 bg-success/10
                rounded-lg flex items-center justify-center"
                >
                  <Package className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {allStores.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stores List */}
        {allStores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <StoreIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No stores yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first store to start selling
              </p>
              <Button onClick={() => navigate.toCreateStore()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Store
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allStores.map((store) => (
              <Card
                key={store.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-0">
                  {/* Store Header */}
                  <div
                    className="h-24 bg-gradient-to-br from-primary/20
                  to-primary/5 flex items-center justify-center relative"
                  >
                    <StoreIcon className="h-10 w-10 text-primary/40" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge variant={getRoleBadgeVariant(store.role) as any}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(store.role)}
                          {store.role}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {store.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {store.description}
                    </p>

                    {/* Store Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-border">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {store.productCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Products
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {store.orderCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          ${store.totalRevenue?.toFixed(0) || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate.toStoreOverview(store.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate.toStoreProducts(store.id)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Products
                      </Button>
                      {(store.role === 'OWNER' ||
                        store.role === 'STORE_ADMIN') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate.toStoreSettings(store.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
