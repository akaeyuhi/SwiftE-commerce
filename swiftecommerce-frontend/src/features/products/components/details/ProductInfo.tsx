import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { toast } from 'sonner';
import { useCart } from '@/app/store';
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  Package,
} from 'lucide-react';
import { ProductVariant } from '@/features/products/types/variant.types.ts';
import { Product } from '@/features/products/types/product.types.ts';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]!);
    }
  }, [product, selectedVariant]);

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
      storeId: product.storeId,
      storeName: product.store?.name || '',
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
                  const variant = product.variants.find(
                    (v) => v.attributes?.[attrKey] === value
                  );
                  const isSelected = selectedVariant?.id === variant?.id;

                  return (
                    <Button
                      key={String(value)}
                      variant={isSelected ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => variant && setSelectedVariant(variant)}
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
            <span className="px-4 text-foreground font-medium">{quantity}</span>
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
          <p className="text-xs font-medium text-foreground">Free Shipping</p>
          <p className="text-xs text-muted-foreground">On orders $50+</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <Shield className="h-6 w-6 text-primary mb-2" />
          <p className="text-xs font-medium text-foreground">2 Year Warranty</p>
          <p className="text-xs text-muted-foreground">Full coverage</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <Package className="h-6 w-6 text-primary mb-2" />
          <p className="text-xs font-medium text-foreground">Easy Returns</p>
          <p className="text-xs text-muted-foreground">30-day policy</p>
        </div>
      </div>
    </div>
  );
}
