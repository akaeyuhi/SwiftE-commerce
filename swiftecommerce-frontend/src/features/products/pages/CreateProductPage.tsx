import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProductForm } from '../components/ProductForm';
import { ProductFormData } from '@/lib/validations/product.schemas';

export function CreateProductPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
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

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await productService.createProduct(storeId!, data)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Creating product:', data);
      toast.success('Product created successfully!');
      navigate.toStoreProducts(storeId!);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
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
        isLoading={isLoading}
        defaultValues={defaultValues}
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
