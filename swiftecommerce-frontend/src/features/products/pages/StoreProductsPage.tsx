import { useState, useMemo, useEffect } from 'react';
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

export function StoreProductsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: string | null;
  }>({ open: false, productId: null });

  const debouncedSearch = useDebounce(searchQuery, 300);

  // ✅ Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortBy]);

  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useProducts(storeId!, {
    search: debouncedSearch,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
    page,
    limit: 9,
  });

  const { data: categoriesData } = useCategories(storeId!);
  const { deleteProduct } = useProductMutations(storeId!);

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;

    await deleteProduct.mutateAsync(deleteDialog.productId, {
      onSuccess: () => {
        setDeleteDialog({ open: false, productId: null });
        refetch();
      },
    });
  };

  const products = useMemo(() => productsData?.data ?? [], [productsData]);
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );
  const meta = productsData?.meta;

  // ✅ Debug logging
  useEffect(() => {
    console.log('Filter state:', {
      searchQuery,
      debouncedSearch,
      selectedCategory,
      sortBy,
      page,
    });
  }, [searchQuery, debouncedSearch, selectedCategory, sortBy, page]);

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
          {products && (
            <>
              <StoreProductsStats products={products} />

              <ProductFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />

              {/* Show active filters */}
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <span>Active filters:</span>
                {debouncedSearch && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    Search: &#34;{debouncedSearch}&#34;
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    Category:{' '}
                    {categories.find((c) => c.id === selectedCategory)?.name}
                  </span>
                )}
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Sort: {sortBy}
                </span>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products found</p>
                  {(debouncedSearch || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="text-primary hover:underline mt-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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
              )}

              {meta && meta.totalPages > 1 && (
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </QueryLoader>

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            setDeleteDialog({ open, productId: deleteDialog.productId })
          }
          title="Delete product?"
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
