import { useState } from 'react';
import { StoreFilters } from '../components/filter/StoreFilters';
import { StoresGrid } from '@/features/stores/components/grid-list/StoresGrid.tsx';
import { useStores } from '@/features/stores/hooks/useStores.ts';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoresPageHeader } from '../components/header/StoresPageHeader';
import { StoresStats } from '../components/stats/StoresStats';

export function StoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const {
    data: stores,
    isLoading,
    error,
    refetch,
  } = useStores({
    sortBy,
    search: searchQuery,
  });

  return (
    <ErrorBoundary title="Stores Page Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <QueryLoader
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            loadingMessage="Loading stores..."
          >
            {stores && (
              <>
                <StoresPageHeader storesCount={stores.length} />
                <StoreFilters
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setSortBy={setSortBy}
                  sortBy={sortBy}
                />
                <StoresStats stores={stores} />
                <StoresGrid stores={stores as any} />
              </>
            )}
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
