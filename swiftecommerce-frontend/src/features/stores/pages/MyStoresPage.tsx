import { useAuth } from '@/app/store';
import { useUser } from '@/features/users/hooks/useUsers.ts';
import { MyStoresHeader } from '../components/MyStoresHeader';
import { MyStoresStats } from '../components/MyStoresStats';
import { StoreList } from '../components/StoreList';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { Store } from '@/features/stores/types/store.types.ts';

export function MyStoresPage() {
  const { user: authUser } = useAuth();
  const { data: user, isLoading, error, refetch } = useUser(authUser!.id);

  const ownedStores = user?.ownedStores || [];
  const storeRoles = user?.roles?.filter((role) => role.isActive) || [];

  const allStores: Store[] = [
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

  return (
    <ErrorBoundary title="My Stores Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <MyStoresHeader />
          <QueryLoader
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            loadingMessage="Loading your stores..."
          >
            <MyStoresStats
              ownedStoresCount={ownedStores.length}
              teamMemberStoresCount={storeRoles.length}
            />
            {allStores.length === 0 ? (
              <p>You are not associated with any stores yet.</p>
            ) : (
              <StoreList stores={allStores} />
            )}
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
