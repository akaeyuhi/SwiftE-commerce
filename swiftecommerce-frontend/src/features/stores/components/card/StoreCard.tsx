import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  Eye,
  Package,
  Settings,
  Shield,
  Store as StoreIcon,
  Users,
  BarChart3,
} from 'lucide-react';
import { Store } from '@/features/stores/types/store.types.ts';
import { useAuth } from '@/app/store';
import { useUserStoreRoles } from '@/features/users/hooks/useUsers.ts';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userRoles } = useUserStoreRoles(user!.id);

  const storeRole = userRoles?.find(
    (role) => role.storeId === store.id
  )?.roleName;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case StoreRoles.ADMIN:
        return <Shield className="h-4 w-4" />;
      case StoreRoles.MODERATOR:
        return <Users className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case StoreRoles.ADMIN:
        return 'Admin';
      case StoreRoles.MODERATOR:
        return 'Moderator';
      default:
        return 'Guest';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case StoreRoles.ADMIN:
        return 'default';
      case StoreRoles.MODERATOR:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
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
            <Badge variant={getRoleBadgeVariant(storeRole!) as any}>
              <span className="flex items-center gap-1">
                {getRoleIcon(storeRole!)}
                {getRoleName(storeRole!)}
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
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {store.orderCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                ${store.totalRevenue || 0}
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
            {storeRole === StoreRoles.ADMIN && (
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
  );
}
