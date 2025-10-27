import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { ProductCard } from '../components/ProductCard';
import { ProductFilters } from '../components/ProductFilters';
import { ProductDetailsDialog } from '../components/ProductDetailsDialog';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Package, Plus, Layers, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog.tsx';
import { mockProducts as products } from '@/shared/mocks/products.mock.ts';
import {
  mockCategories as categories,
  MockCategory,
} from '@/shared/mocks/categories.mock.ts';

export function StoreProductsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    MockCategory | 'all'
  >('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: string | null;
  }>({
    open: false,
    productId: null,
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.variants.some((v: any) =>
        v.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'all' ||
      product.categories.some((c: any) => c.name === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const stats = [
    {
      title: 'Total Products',
      value: products.length,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Variants',
      value: products.reduce((sum, p) => sum + p.variants.length, 0),
      icon: Layers,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Stock',
      value: products.reduce(
        (sum, p) =>
          sum +
          p.variants.reduce((s: number, v: any) => s + v.inventory.quantity, 0),
        0
      ),
      icon: Package,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Sales',
      value: products.reduce((sum, p) => sum + p.totalSales, 0),
      icon: Eye,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;

    try {
      // TODO: API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success('Product deleted successfully');
      setDeleteDialog({ open: false, productId: null });
    } catch (error) {
      toast.error(`Failed to delete product: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => navigate.toStoreProductCreate(storeId!)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      {/* Filters */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'
            }
            action={
              !searchQuery && selectedCategory === 'all'
                ? {
                    label: 'Add Product',
                    onClick: () => navigate.toStoreProductCreate(storeId!),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onEdit={(id) => navigate.toStoreProductEdit(storeId!, id)}
              onDelete={(id) => setDeleteDialog({ open: true, productId: id })}
              onView={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, productId: null })}
        title="Delete product?"
        description="This will permanently delete this
         and all its variants. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
