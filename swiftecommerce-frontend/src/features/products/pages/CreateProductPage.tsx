import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../components/form/ProductForm';
import { ProductFormData } from '@/lib/validations/product.schemas';
import { useProductMutations } from '../hooks/useProductMutations';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { CreateProductDto } from '../types/dto.types';

export function CreateProductPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: store } = useStore(storeId!);
  const { createProduct } = useProductMutations(storeId!);

  const aiGeneratedData = location.state?.aiGenerated;
  console.log(aiGeneratedData);
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
    const mainPhoto = newImages.length > 0 ? newImages[0] : undefined;
    const otherPhotos = newImages.length > 1 ? newImages.slice(1) : [];

    const dto: CreateProductDto = {
      ...data,
      storeId: store!.id,
      variants: data.variants.map((v) => ({
        ...v,
        initialQuantity: v.quantity,
      })),
      mainPhoto,
      photos: otherPhotos,
    };

    await createProduct.mutateAsync(dto, {
      onSuccess: () => {
        navigate.toStoreProducts(storeId!);
      },
    });
  };

  if (!store) {
    return null;
  }

  return (
    <ErrorBoundary title="Create Product Error">
      <div className="space-y-6 max-w-5xl">
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

        <ProductForm
          availableCategories={store.categories!}
          onSubmit={handleSubmit}
          isLoading={createProduct.isPending}
          defaultValues={defaultValues}
        />

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
