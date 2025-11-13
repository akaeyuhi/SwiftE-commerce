import { Card, CardContent } from '@/shared/components/ui/Card';
import { StoreIcon, Users, Package } from 'lucide-react';

interface MyStoresStatsProps {
  ownedStoresCount: number;
  teamMemberStoresCount: number;
}

export function MyStoresStats({
  ownedStoresCount,
  teamMemberStoresCount,
}: MyStoresStatsProps) {
  const totalAccess = ownedStoresCount + teamMemberStoresCount;

  return (
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
                {ownedStoresCount}
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
                {teamMemberStoresCount}
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
                {totalAccess}
              </p>
              <p className="text-sm text-muted-foreground">Total Access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
