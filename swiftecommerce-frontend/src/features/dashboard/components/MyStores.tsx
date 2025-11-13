import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Store } from 'lucide-react';
import { useMyStores } from '../hooks/useDashboard';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Store as StoreType } from '@/features/stores/types/store.types';
import { useAuth } from '@/app/store';

function MyStoreRow({ store }: { store: StoreType }) {
  const navigate = useNavigate();
  return (
    <div
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
        <h3 className="font-semibold text-foreground">{store.name}</h3>
        <p className="text-sm text-muted-foreground">
          {store.productCount} products
        </p>
      </div>
      <Badge variant="success">Active</Badge>
    </div>
  );
}

export function MyStores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data: myStores,
    isLoading,
    error,
    refetch,
  } = useMyStores(user!.id, 3);

  return (
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
        <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
          {isLoading ? (
            <SkeletonLoader count={3} height="h-20" />
          ) : !myStores || myStores.length === 0 ? (
            <EmptyState
              icon={Store}
              title="You don't have any stores yet"
              description="Create a store to start selling your products."
              action={{
                label: 'Create Store',
                onClick: () => navigate.toCreateStore(),
              }}
            />
          ) : (
            <div className="space-y-4">
              {myStores.map((store: StoreType) => (
                <MyStoreRow key={store.id} store={store} />
              ))}
            </div>
          )}
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
