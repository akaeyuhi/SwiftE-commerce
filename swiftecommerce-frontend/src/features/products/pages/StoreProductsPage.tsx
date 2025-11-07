import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreProductsHeader } from '../components/header/StoreProductsHeader';
import { StoreProductsStats } from '../components/stats/StoreProductsStats';
import { ProductFilters } from '../components/filter/ProductFilters';
import { ProductCard } from '../components/card/ProductCard';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useProductMutations } from '../hooks/useProductMutations';
import { CategoryDto } from '@/features/categories/types/categories.types.ts';

export function StoreProductsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | 'all'>(
    'all'
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: string | null;
  }>({ open: false, productId: null });

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useProducts(storeId!, {
    search: searchQuery,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory.id,
  });
  const { data: categories } = useCategories(storeId!);
  const { deleteProduct } = useProductMutations(storeId!);

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;

    await deleteProduct.mutateAsync(deleteDialog.productId, {
      onSuccess: () => {
        setDeleteDialog({ open: false, productId: null });
      },
    });
  };

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
              <StoreProductsStats products={products.data} />
              <ProductFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categories={categories || []}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.data.map((product) => (
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
            </>
          )}
        </QueryLoader>
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, productId: null })}
          title="Delete product?"
          description="This will permanently delete this product
          and all its variants. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDelete}
        />
      </div>
    </ErrorBoundary>
  );
}
