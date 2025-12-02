import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../components/form/ProductForm';
import { ProductFormData } from '@/lib/validations/product.schemas';
import { useDetailedProduct } from '../hooks/useProducts';
import { useProductMutations } from '../hooks/useProductMutations';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { useVariantMutations } from '../hooks/useVariants';
import { useMemo, useState } from 'react';
import { UpdateProductDto } from '../types/dto.types';
import { useCategories } from '@/features/categories/hooks/useCategories.ts';

export function EditProductPage() {
  const { storeId, productId } = useParams<{
    storeId: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useDetailedProduct(storeId!, productId!);
  const { data: store } = useStore(storeId!);
  const { data: categoriesData } = useCategories(storeId!);
  const { updateProduct } = useProductMutations(storeId!);
  const { deleteVariant } = useVariantMutations(storeId!, productId!);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const categories = useMemo(() => categoriesData?.data, [categoriesData]);

  const handleRemoveVariant = (variantId: string) => {
    setDeletedVariantIds((prev) => [...prev, variantId]);
  };

  const handleSubmit = async (data: ProductFormData, newImages: File[]) => {
    const createVariants = data.variants
      .filter((v) => !v.id)
      .map((v) => ({ ...v, initialQuantity: v.quantity }));

    const updateVariants = data.variants
      .filter((v) => v.id)
      .map((v) => ({ ...v, variantId: v.id! }));

    for (const variantId of deletedVariantIds) {
      await deleteVariant.mutateAsync(variantId);
    }

    const dto: UpdateProductDto = {
      ...data,
      variants: createVariants,
      updateVariants,
      photos: newImages,
    };

    await updateProduct.mutateAsync(
      { id: productId!, data: dto },
      {
        onSuccess: () => {
          navigate.toStoreProducts(storeId!);
        },
      }
    );
  };

  const defaultValues: Partial<ProductFormData> | undefined = product
    ? {
        name: product.name,
        description: product.description,
        categoryIds: product.categories?.map((c) => c.id) || [],
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          quantity: v.inventory.quantity,
          attributes: v.attributes || {},
        })),
      }
    : undefined;

  return (
    <ErrorBoundary title="Edit Product Error">
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
            Edit Product
          </h1>
          <p className="text-muted-foreground">
            Update product information and variants
          </p>
        </div>

        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading product data..."
        >
          {product && store && (
            <ProductForm
              availableCategories={categories!}
              onSubmit={handleSubmit}
              isLoading={updateProduct.isPending || deleteVariant.isPending}
              defaultValues={defaultValues}
              isEdit
              existingImageUrls={product.photos?.map((p) => p.url) || []}
              onRemoveVariant={handleRemoveVariant}
            />
          )}
        </QueryLoader>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate.toStoreProducts(storeId!)}
            disabled={updateProduct.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
