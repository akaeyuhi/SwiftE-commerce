import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProductForm } from '../components/ProductForm';
import { ProductFormData } from '@/lib/validations/product.schemas';
import { mockProducts } from '@/shared/mocks/products.mock';

export function EditProductPage() {
  const { storeId, productId } = useParams<{
    storeId: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Find product from mock data
  const product = mockProducts.find((p) => p.id === productId);

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Product not found
        </h2>
        <Button onClick={() => navigate.toStoreProducts(storeId!)}>
          Back to Products
        </Button>
      </div>
    );
  }

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await productService.updateProduct(storeId!, productId!, data)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Updating product:', data);
      toast.success('Product updated successfully!');
      navigate.toStoreProducts(storeId!);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  // Transform product data to form format
  const defaultValues: Partial<ProductFormData> = {
    name: product.name,
    description: product.description,
    categoryIds: product.categories.map((c) => c.id),
    variants: product.variants.map((v) => ({
      sku: v.sku,
      price: v.price,
      quantity: v.inventory.quantity,
      attributes: v.attributes || {},
    })),
  };

  return (
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Edit Product
            </h1>
            <p className="text-muted-foreground">
              Update product information and variants
            </p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </div>

      {/* Product Form */}
      <ProductForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isEdit
        existingImageUrls={existingImages}
        onRemoveExistingImage={handleRemoveExistingImage}
      />

      {/* Cancel Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate.toStoreProducts(storeId!)}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
