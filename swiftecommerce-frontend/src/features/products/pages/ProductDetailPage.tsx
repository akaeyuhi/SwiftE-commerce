import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Package,
  Truck,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { mockProducts, MockVariant } from '@/shared/mocks/products.mock';
import { toast } from 'sonner';
import { useCart } from '@/app/store';
import { useAuth } from '@/app/store';
import { mockReviews } from '@/shared/mocks/reviews.mock.ts';
import {
  ReviewForm,
  ReviewFormData,
} from '@/features/reviews/components/ReviewForm.tsx';
import { ReviewsList } from '@/features/reviews/components/ReviewsList.tsx';

export function ProductDetailPage() {
  const { addItem } = useCart();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<MockVariant | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isAuthenticated } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const product = mockProducts.find((p) => p.id === productId);

  const productReviews = mockReviews.filter((r) => r.productId === productId);

  const handleReviewSubmit = async (data: ReviewFormData) => {
    try {
      // TODO: API call
      // await reviewService.createReview(productId, data)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Submitting review:', data);
      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    }
  };

  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]!);
    }
  }, [product, selectedVariant]);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Product not found
        </h1>
        <Button onClick={() => navigate.toProducts()}>Back to Products</Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    if (quantity > selectedVariant.inventory.quantity) {
      toast.error('Not enough stock available');
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      variantSku: selectedVariant.sku,
      price: selectedVariant.price,
      quantity,
      maxQuantity: selectedVariant.inventory.quantity,
      attributes: selectedVariant.attributes,
      storeId: '1', // TODO: Get from product/store context
      storeName: 'Tech Haven', // TODO: Get from product/store context
    });

    toast.success(`Added ${quantity} item(s) to cart`);
    setQuantity(1);
  };

  const getStockStatus = () => {
    if (!selectedVariant) return null;
    const stock = selectedVariant.inventory.quantity;

    if (stock === 0) {
      return { label: 'Out of Stock', color: 'text-error' };
    } else if (stock < 10) {
      return { label: `Only ${stock} left`, color: 'text-warning' };
    }
    return { label: 'In Stock', color: 'text-success' };
  };

  const stockStatus = getStockStatus();

  // Get unique attribute keys and values
  const getAttributeOptions = () => {
    if (!product.variants.length) return {};

    const attributeMap: Record<string, Set<string>> = {};

    product.variants.forEach((variant) => {
      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!attributeMap[key]) {
            attributeMap[key] = new Set();
          }
          attributeMap[key].add(String(value));
        });
      }
    });

    return Object.fromEntries(
      Object.entries(attributeMap).map(([key, values]) => [
        key,
        Array.from(values),
      ])
    );
  };

  const attributeOptions = getAttributeOptions();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button
            onClick={() => navigate.toProducts()}
            className="hover:text-foreground"
          >
            Products
          </button>
          <ChevronRight className="h-4 w-4" />
          {product.categories.length > 0 &&
            product.categories.map((category) => (
              <>
                <span
                  className="hover:text-foreground cursor-pointer"
                  key={category.id}
                >
                  {category.name}
                </span>
                <ChevronRight className="h-4 w-4" />
              </>
            ))}
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            </Card>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className={`cursor-pointer overflow-hidden ${
                    currentImageIndex === i - 1 ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setCurrentImageIndex(i - 1)}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Rating */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">
                    {product.averageRating}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({product.reviewCount} reviews)
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.totalSales} sold
                </span>
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-4xl font-bold text-foreground">
                ${selectedVariant?.price.toFixed(2)}
              </p>
              {stockStatus && (
                <p className={`text-sm font-medium mt-1 ${stockStatus.color}`}>
                  {stockStatus.label}
                </p>
              )}
            </div>

            {/* Variant Selection */}
            {product.variants.length > 1 && (
              <div className="space-y-3">
                {Object.entries(attributeOptions).map(([attrKey, values]) => (
                  <div key={attrKey}>
                    <label className="text-sm font-medium text-foreground mb-2 block capitalize">
                      {attrKey}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => {
                        // Find variant with this attribute value
                        const variant = product.variants.find(
                          (v) => v.attributes?.[attrKey] === value
                        );
                        const isSelected = selectedVariant?.id === variant?.id;

                        return (
                          <Button
                            key={String(value)}
                            variant={isSelected ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() =>
                              variant && setSelectedVariant(variant)
                            }
                            disabled={variant?.inventory.quantity === 0}
                          >
                            {String(value)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="px-4 text-foreground font-medium">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          selectedVariant?.inventory.quantity || 1,
                          quantity + 1
                        )
                      )
                    }
                    disabled={
                      !selectedVariant ||
                      quantity >= selectedVariant.inventory.quantity
                    }
                  >
                    +
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedVariant?.inventory.quantity} available
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={
                  !selectedVariant || selectedVariant.inventory.quantity === 0
                }
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="flex flex-col items-center text-center">
                <Truck className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">
                  Free Shipping
                </p>
                <p className="text-xs text-muted-foreground">On orders $50+</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Shield className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">
                  2 Year Warranty
                </p>
                <p className="text-xs text-muted-foreground">Full coverage</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Package className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">
                  Easy Returns
                </p>
                <p className="text-xs text-muted-foreground">30-day policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Product Description
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Product Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-foreground">
                  {selectedVariant?.sku}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Categories</span>
                <span className="text-foreground">
                  {product.categories.map((c) => c.name).join(', ')}
                </span>
              </div>
              {selectedVariant?.attributes &&
                Object.entries(selectedVariant.attributes).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between py-2 border-b border-border"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key}
                      </span>
                      <span className="text-foreground">{String(value)}</span>
                    </div>
                  )
                )}
            </div>
          </CardContent>
        </Card>
        {/* Customer Reviews */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Customer Reviews
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">
                      {product.averageRating}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({product.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>
              {isAuthenticated && !showReviewForm && (
                <Button onClick={() => setShowReviewForm(true)}>
                  Write a Review
                </Button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Write Your Review
                  </h3>
                  <ReviewForm
                    onSubmit={handleReviewSubmit}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            <ReviewsList
              reviews={productReviews.map(
                (r) =>
                  ({
                    id: r.id,
                    author: r.author,
                    rating: r.rating,
                    date: r.date,
                    content: r.content,
                    helpfulCount: r.helpfulCount,
                    verified: r.verified,
                  }) as any
              )}
              onMarkHelpful={() => {
                toast.success('Marked as helpful');
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
