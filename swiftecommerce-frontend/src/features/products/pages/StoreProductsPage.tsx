import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreProductsHeader } from '../components/header/StoreProductsHeader';
import { StoreProductsStats } from '../components/stats/StoreProductsStats';
import { ProductCard } from '../components/card/ProductCard';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useProductMutations } from '../hooks/useProductMutations';
import { ProductFilters } from '@/features/products/components/filter/ProductFilters.tsx';
import { useDebounce } from '@/shared/hooks/useDebounce.ts';
import { Pagination } from '@/shared/components/ui/Pagination.tsx';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { X, Plus } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';

type SortOption =
  | 'relevance'
  | 'views'
  | 'sales'
  | 'rating'
  | 'price'
  | 'recent';

export function StoreProductsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: string | null;
  }>({ open: false, productId: null });

  const debouncedSearch = useDebounce(searchQuery, 300);
  const limit = 12;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortBy]);

  const {
    data: productsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProducts(storeId!, {
    query: debouncedSearch,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
    limit,
    offset: (page - 1) * limit,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories(
    storeId!
  );
  const { deleteProduct } = useProductMutations(storeId!);

  const products = useMemo(() => productsData?.data ?? [], [productsData]);
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );
  const total = productsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('recent');
  }, []);

  const hasActiveFilters = debouncedSearch !== '' || selectedCategory !== 'all';

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;

    await deleteProduct.mutateAsync(deleteDialog.productId, {
      onSuccess: () => {
        setDeleteDialog({ open: false, productId: null });
        refetch();
      },
    });
  };

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  return (
    <ErrorBoundary title="Store Products Error">
      <div className="space-y-6">
        <StoreProductsHeader storeId={storeId!} />
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading products..."
        >
          {/* Stats */}
          {products.length > 0 && <StoreProductsStats products={products} />}

          {/* Filters */}
          <ProductFilters
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isLoading={isFetching || categoriesLoading}
          />

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Active Filters:
                  </span>

                  {debouncedSearch && (
                    <Badge variant="secondary" className="gap-1">
                      Search: &#34;{debouncedSearch}&#34;
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleSearchChange('')}
                      />
                    </Badge>
                  )}

                  {selectedCategory !== 'all' && selectedCategoryName && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {selectedCategoryName}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedCategory('all')}
                      />
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto"
                  >
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isFetching
                ? 'Searching...'
                : `${total} ${total === 1 ? 'product' : 'products'} found`}
            </p>
            {sortBy !== 'recent' && (
              <p className="text-xs text-muted-foreground">
                Sorted by: {sortBy}
              </p>
            )}
          </div>

          {/* Products Grid or Empty State */}
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div
                    className="mx-auto w-12 h-12 rounded-full
                  bg-muted flex items-center justify-center"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {hasActiveFilters
                        ? 'No products found'
                        : 'No products yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {hasActiveFilters
                        ? 'Try adjusting your filters or search query'
                        : 'Get started by adding your first product'}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate.toStoreProductCreate(storeId!)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Product
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    onEdit={(id) => navigate.toStoreProductEdit(storeId!, id)}
                    onDelete={(id) =>
                      setDeleteDialog({ open: true, productId: id })
                    }
                    onView={() => navigate.toProduct(product.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </QueryLoader>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            setDeleteDialog({ open, productId: deleteDialog.productId })
          }
          title="Delete Product?"
          description="This will permanently delete this product and all its variants.
          This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDelete}
          loading={deleteProduct.isPending}
        />
      </div>
    </ErrorBoundary>
  );
}
