import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card';

interface StoreStatsProps {
  store: {
    productCount: number;
    orderCount: number;
    totalRevenue: number;
    followerCount: number;
  };
}

export function StoreStats({ store }: StoreStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Statistics</CardTitle>
        <CardDescription>Overview of your store performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Total Products
            </p>
            <p className="text-2xl font-bold text-foreground">{store.productCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-foreground">{store.orderCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-foreground">${store.totalRevenue}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Followers</p>
            <p className="text-2xl font-bold text-foreground">{store.followerCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
