import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '@/features/stores/hooks/useStores';
import { useProducts } from '@/features/products/hooks/useProducts';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ErrorState } from '@/shared/components/errors/ErrorState';
import { StorePublicHeader } from '../components/header/StorePublicHeader';
import { ProductGrid } from '../components/grid-list/ProductGrid';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { ProductListDto } from '@/features/products/types/product.types.ts';
import { ProductFilters } from '@/features/products/components/filter/ProductFilters.tsx';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuth } from '@/app/store';
import { useLikes, useLikeMutations } from '@/features/likes/hooks/useLikes';
import { toast } from 'sonner';
import { Store } from '@/features/stores/types/store.types.ts';

type SortOption =
  | 'relevance'
  | 'views'
  | 'sales'
  | 'rating'
  | 'price'
  | 'recent';

export function StorePublicPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const { user } = useAuth();

  const debouncedSearch = useDebounce(searchQuery, 300);

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
    refetch: refetchProducts,
  } = useProducts(storeId!, {
    query: debouncedSearch,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
  });

  const { data: userLikes, isLoading: likesLoading } = useLikes(
    user?.id ?? '',
    { enabled: !!user?.id }
  );

  const { likeStore, removeLike } = useLikeMutations(user?.id ?? '');

  const storeLike = useMemo(
    () => userLikes?.find((like) => like.storeId === storeId),
    [userLikes, storeId]
  );

  const isFollowing = !!storeLike;

  const products = data?.data || [];

  useEffect(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('relevance');
  }, [storeId]);

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('Please sign in to follow stores');
      return;
    }

    if (!storeId) return;

    try {
      if (isFollowing && storeLike) {
        // Unfollow
        await removeLike.mutateAsync(storeLike.id);
        store!.followerCount--;
      } else {
        // Follow
        await likeStore.mutateAsync(storeId);
        store!.followerCount++;
      }
    } catch (error: any) {
      // Error already handled in mutation
      console.error('Follow toggle failed:', error);
    }
  };

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
        {/* Store Banner */}
        {storeLoading ? (
          <div className="h-48 bg-muted animate-pulse" />
        ) : (
          <div
            className="h-48 bg-gradient-to-br from-primary/20
          to-primary/5 relative overflow-hidden"
          >
            {store?.bannerUrl ? (
              <img
                src={store.bannerUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-4xl font-bold">{store?.name?.[0]}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="container mx-auto px-4">
          {/* Store Header with Follow Button */}
          <QueryLoader
            isLoading={storeLoading}
            isFetching={storeFetching}
            error={storeError}
            refetch={refetchStore}
            loadingMessage="Loading store information..."
            showOverlayOnRefetch={true}
          >
            {store && (
              <StorePublicHeader
                store={store as Store}
                isFollowing={isFollowing}
                onFollowToggle={handleFollowToggle}
                isFollowLoading={
                  likeStore.isPending || removeLike.isPending || likesLoading
                }
                isAuthenticated={!!user}
              />
            )}
          </QueryLoader>

          {/* Filters */}
          <ProductFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            categories={store?.categories || []}
            isLoading={productsLoading}
          />

          {/* Products Grid */}
          <QueryLoader
            isLoading={productsLoading}
            error={productsError}
            refetch={refetchProducts}
            loadingMessage="Loading products..."
          >
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {debouncedSearch
                    ? `No products found matching "${debouncedSearch}"`
                    : selectedCategory !== 'all'
                      ? 'No products in this category'
                      : 'No products available'}
                </p>
                {(debouncedSearch || selectedCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {products.length}{' '}
                  {products.length === 1 ? 'product' : 'products'} found
                </div>
                <ProductGrid products={products as ProductListDto[]} />
              </div>
            )}
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
