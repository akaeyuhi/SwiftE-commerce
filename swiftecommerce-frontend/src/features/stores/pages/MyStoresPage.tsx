import { useAuth } from '@/app/store';
import { useMyProfile } from '@/features/users/hooks/useUsers.ts';
import { MyStoresHeader } from '../components/header/MyStoresHeader';
import { MyStoresStats } from '../components/stats/MyStoresStats';
import { StoreList } from '../components/grid-list/StoreList';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { Store } from '@/features/stores/types/store.types.ts';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';

export function MyStoresPage() {
  const { user: authUser } = useAuth();
  const { data: user, isLoading, error, refetch } = useMyProfile(authUser!.id);

  const ownedStores = user?.ownedStores || [];
  const storeRoles = user?.roles?.filter((role) => role.isActive) || [];

  const allStores: Store[] = [
    ...storeRoles.map((role) => ({
      ...role.store,
      accessType: role.roleName === StoreRoles.ADMIN ? 'Admin' : 'Team',
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
