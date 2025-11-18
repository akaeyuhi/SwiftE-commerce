import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/app/store';
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
import { useCartMutations } from '@/features/cart/hooks/useCart.ts';
import { ROUTES } from '@/app/routes/routes.ts';
import { Link } from '@/shared/components/ui/Link.tsx';
import { toast } from 'sonner';
import { buildUrl } from '@/config/api.config.ts';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const { addItem } = useCartMutations(user?.id ?? '');

  // Get all unique attribute keys and values
  const attributeOptions = useMemo(() => {
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
        Array.from(values).sort(),
      ])
    );
  }, [product.variants]);

  // Initialize with first available variant
  useEffect(() => {
    if (product.variants.length === 0) return;

    const firstAvailable = product.variants.find(
      (v) => v.inventory?.quantity > 0
    );

    const initial = firstAvailable || product.variants[0];

    if (initial?.attributes) {
      setSelectedOptions(initial.attributes);
    }
  }, [product.variants]);

  // Find matching variant when options change
  useEffect(() => {
    if (Object.keys(selectedOptions).length === 0) {
      setSelectedVariant(null);
      return;
    }

    const matchingVariant = product.variants.find((variant) =>
      Object.entries(selectedOptions).every(
        ([key, value]) => variant.attributes?.[key] === value
      )
    );

    setSelectedVariant(matchingVariant || null);
  }, [selectedOptions, product.variants]);

  // ✅ FIXED: More lenient availability check
  const isOptionAvailable = (attributeKey: string, attributeValue: string) =>
    // An option is available if ANY variant has this attribute value
    product.variants.some(
      (variant) => variant.attributes?.[attributeKey] === attributeValue
    );
  // ✅ NEW: Smart attribute selection that finds best match
  const handleAttributeSelect = (key: string, value: string) => {
    // Create new selection with this attribute changed
    const newSelection = {
      ...selectedOptions,
      [key]: value,
    };

    // Try to find exact match with all selected options
    let matchingVariant = product.variants.find((variant) =>
      Object.entries(newSelection).every(
        ([k, v]) => variant.attributes?.[k] === v
      )
    );

    // If no exact match, find best partial match
    if (!matchingVariant) {
      // Find variants that have the newly selected attribute
      const variantsWithNewAttribute = product.variants.filter(
        (v) => v.attributes?.[key] === value
      );

      if (variantsWithNewAttribute.length > 0) {
        // Prefer variants with stock
        matchingVariant =
          variantsWithNewAttribute.find((v) => v.inventory?.quantity > 0) ||
          variantsWithNewAttribute[0];

        // Update selection to match the found variant
        if (matchingVariant?.attributes) {
          setSelectedOptions(matchingVariant.attributes);
          return;
        }
      }
    }

    // Set the new selection
    setSelectedOptions(newSelection);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Please select all options');
      return;
    }

    if (
      !selectedVariant.inventory ||
      selectedVariant.inventory.quantity === 0
    ) {
      toast.error('This variant is out of stock');
      return;
    }

    if (quantity > selectedVariant.inventory.quantity) {
      toast.error(`Only ${selectedVariant.inventory.quantity} available`);
      return;
    }

    try {
      await addItem.mutateAsync({
        storeId: product.storeId,
        item: {
          variantId: selectedVariant.id,
          productId: product.id,
          quantity,
        },
      });
      setQuantity(1);
    } catch (error) {
      toast.error(`Failed to add to cart: ${error}`);
    }
  };

  const getStockStatus = () => {
    if (!selectedVariant) {
      return { label: 'Select options', color: 'text-muted-foreground' };
    }

    const stock = selectedVariant.inventory?.quantity ?? 0;

    if (stock === 0) {
      return { label: 'Out of Stock', color: 'text-error' };
    }
    if (stock < 10) {
      return { label: `Only ${stock} left`, color: 'text-warning' };
    }
    return { label: 'In Stock', color: 'text-success' };
  };

  const stockStatus = getStockStatus();
  const hasStock =
    selectedVariant && (selectedVariant.inventory?.quantity ?? 0) > 0;

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
              {product.averageRating?.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-sm text-muted-foreground">
              ({product.reviewCount ?? 0} reviews)
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {product.totalSales ?? 0} sold
          </span>
        </div>
        <div className="mt-4">
          <Link
            to={buildUrl(ROUTES.STORE_PUBLIC, { storeId: product.storeId })}
            className="text-lg text-muted-foreground hover:text-primary transition-colors"
          >
            Seller: {product.storeName || 'Unknown'}
          </Link>
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="text-4xl font-bold text-foreground">
          $
          {selectedVariant?.price.toFixed(2) ??
            product.variants[0]?.price.toFixed(2) ??
            '0.00'}
        </p>
        <p className={`text-sm font-medium mt-1 ${stockStatus.color}`}>
          {stockStatus.label}
        </p>
      </div>

      {/* Variant Selection */}
      {Object.keys(attributeOptions).length > 0 && (
        <div className="space-y-4">
          {Object.entries(attributeOptions).map(([attrKey, values]) => (
            <div key={attrKey}>
              <label className="text-sm font-medium text-foreground mb-2 block capitalize">
                {attrKey}:{' '}
                <span className="text-primary">
                  {selectedOptions[attrKey] || 'Select'}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const isAvailable = isOptionAvailable(attrKey, value);
                  const isSelected = selectedOptions[attrKey] === value;

                  return (
                    <Button
                      key={value}
                      variant={isSelected ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleAttributeSelect(attrKey, value)}
                      disabled={!isAvailable}
                      className={
                        !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                      }
                    >
                      {value}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show variant info if selection doesn't match */}
      {selectedVariant && (
        <div className="text-sm text-muted-foreground">
          SKU: {selectedVariant.sku}
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
            <span className="px-4 text-foreground font-medium min-w-[3rem] text-center">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const maxQty = selectedVariant?.inventory?.quantity ?? 1;
                setQuantity(Math.min(maxQty, quantity + 1));
              }}
              disabled={
                !selectedVariant ||
                quantity >= (selectedVariant.inventory?.quantity ?? 0)
              }
            >
              +
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedVariant?.inventory?.quantity ?? 0} available
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!hasStock || addItem.isPending}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          {addItem.isPending ? 'Adding...' : 'Add to Cart'}
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
