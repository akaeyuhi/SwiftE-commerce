import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../components/ProductForm';
import { ProductFormData } from '@/lib/validations/product.schemas';
import { useProductMutations } from '../hooks/useProductMutations';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';

export function CreateProductPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { createProduct } = useProductMutations(storeId!);

  const aiGeneratedData = location.state?.aiGenerated;
  const defaultValues = aiGeneratedData
    ? {
        name: aiGeneratedData.name || '',
        description: aiGeneratedData.description || '',
        categoryIds: aiGeneratedData.categories || [],
        variants: aiGeneratedData.variants || [
          { sku: '', price: 0, quantity: 0, attributes: {} },
        ],
      }
    : undefined;

  const handleSubmit = async (data: ProductFormData, newImages: File[]) => {
    await createProduct.mutateAsync(
      { ...data, images: newImages },
      {
        onSuccess: () => {
          navigate.toStoreProducts(storeId!);
        },
      }
    );
  };

  return (
    <ErrorBoundary title="Create Product Error">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <Link
            to={ROUTES.STORE_PRODUCTS.replace(':storeId', storeId!)}
            className="inline-flex items-center gap-2 text-sm
          text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Add New Product
          </h1>
          <p className="text-muted-foreground">
            Create a product with variants and inventory
          </p>
        </div>

        {/* Product Form */}
        <ProductForm
          onSubmit={handleSubmit}
          isLoading={createProduct.isPending}
          defaultValues={defaultValues}
        />

        {/* Cancel Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate.toStoreProducts(storeId!)}
            disabled={createProduct.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
