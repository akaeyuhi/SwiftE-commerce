import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '@/features/stores/hooks/useStores';
import { useProducts } from '@/features/products/hooks/useProducts';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ErrorState } from '@/shared/components/errors/ErrorState';
import { StorePublicHeader } from '../components/header/StorePublicHeader';
import { ProductFilters } from '../components/filter/ProductFilters';
import { ProductGrid } from '../components/grid-list/ProductGrid';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { ProductListDto } from '@/features/products/types/product.types.ts';

export function StorePublicPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const {
    data: store,
    isLoading: storeLoading,
    error: storeError,
    refetch: refetchStore,
    isFetching: storeFetching,
  } = useStore(storeId!);

  const {
    data,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts(storeId!, {
    search: searchQuery,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
  });

  const products = data?.data;

  if (storeError && !storeLoading) {
    return (
      <ErrorState
        error={storeError}
        title="Store not found"
        description="The store you're looking for doesn't exist or has been removed"
        variant="full-page"
        actions={[
          {
            label: 'Back to Stores',
            onClick: () => window.history.back(),
          },
        ]}
      />
    );
  }

  return (
    <ErrorBoundary title="Store Page Error">
      <div className="min-h-screen bg-background">
        {storeLoading ? (
          <div className="h-48 bg-muted animate-pulse" />
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative">
            {store?.bannerUrl && (
              <img
                src={store.bannerUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        <div className="container mx-auto px-4">
          <QueryLoader
            isLoading={storeLoading}
            isFetching={storeFetching}
            error={storeError}
            refetch={refetchStore}
            loadingMessage="Loading store information..."
            showOverlayOnRefetch={true}
          >
            {store && <StorePublicHeader store={store} />}
          </QueryLoader>

          <ProductFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            categories={store?.categories || []}
          />

          <QueryLoader
            isLoading={productsLoading}
            error={productsError}
            loadingMessage="Loading products..."
          >
            <ProductGrid products={products || ([] as ProductListDto[])} />
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
