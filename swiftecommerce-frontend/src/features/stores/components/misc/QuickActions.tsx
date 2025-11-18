import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { buildUrl } from '@/config/api.config.ts';

interface QuickActionsProps {
  storeId: string;
}

export function QuickActions({ storeId }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to manage your store</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={buildUrl(ROUTES.STORE_PRODUCTS_CREATE, { storeId })}
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
            to={buildUrl(ROUTES.STORE_ORDERS, { storeId })}
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
            to={buildUrl(ROUTES.STORE_ANALYTICS, { storeId })}
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
  );
}
