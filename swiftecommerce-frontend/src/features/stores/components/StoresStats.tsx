import { Card, CardContent } from '@/shared/components/ui/Card';
import { StoreDto } from '@/features/stores/types/store.types.ts';

interface StoresStatsProps {
  stores: StoreDto[];
}

export function StoresStats({ stores }: StoresStatsProps) {
  const totalProducts = stores.reduce((sum, s) => sum + s.productCount, 0);
  const totalRevenue = stores.reduce((sum, s) => sum + s.totalRevenue, 0);
  const averageOrders =
    stores.reduce((sum, s) => sum + (s.orderCount || 0), 0) / stores.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-primary mb-1">
            {stores.length}
          </p>
          <p className="text-sm text-muted-foreground">Active Stores</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-success mb-1">
            {totalProducts}
          </p>
          <p className="text-sm text-muted-foreground">Total Products</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-info mb-1">{totalRevenue}</p>
          <p className="text-sm text-muted-foreground">Total revenue</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-warning mb-1">
            {averageOrders.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">Total orders</p>
        </CardContent>
      </Card>
    </div>
  );
}
