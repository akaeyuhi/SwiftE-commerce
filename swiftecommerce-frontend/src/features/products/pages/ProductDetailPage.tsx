import { useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ProductImageGallery } from '../components/details/ProductImageGallery';
import { ProductInfo } from '../components/details/ProductInfo';
import { ProductDescription } from '../components/details/ProductDescription';
import { ProductDetails } from '../components/details/ProductDetails';
import { CustomerReviews } from '../components/details/CustomerReviews';
import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from '@/shared/hooks/useNavigate';

export function ProductDetailPage() {
  const { productId, storeId } = useParams<{
    productId: string;
    storeId: string;
  }>();
  const navigate = useNavigate();
  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useProduct(storeId!, productId!);

  return (
    <ErrorBoundary title="Product Detail Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <QueryLoader
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            loadingMessage="Loading product details..."
          >
            {product && product.variants ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                  <ProductImageGallery images={product.photos || []} />
                  <ProductInfo product={product} />
                </div>
                <ProductDescription description={product.description || ''} />
                <ProductDetails
                  product={product}
                  selectedVariant={product.variants?.[0]}
                />
                <CustomerReviews
                  productId={product.id}
                  storeId={product.storeId}
                  productName={product.name}
                  averageRating={product.averageRating || 0}
                  reviewCount={product.reviewCount || 0}
                />
              </>
            ) : (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">
                  Product not found
                </h1>
                <Button onClick={() => navigate.toProducts()}>
                  Back to Products
                </Button>
              </div>
            )}
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
