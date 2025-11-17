import { Card, CardContent } from '@/shared/components/ui/Card';
import { Package, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useCart } from '@/app/store';
import { ProductListDto } from '@/features/products/types/product.types.ts';

interface ProductPublicCardProps {
  product: ProductListDto;
}

export const ProductPublicCard: React.FC<ProductPublicCardProps> = ({
  product,
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();

  if (!product) return;

  const minPrice = product.minPrice;
  const maxPrice = product.maxPrice;
  const hasMultiplePrices = minPrice !== maxPrice;

  const inStock = product?.variants?.some((v) => v.inventory.quantity > 0);

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate.toProduct(product?.id)}
    >
      <CardContent className="p-0">
        {/* Product Image */}
        <div className="aspect-square bg-muted flex items-center justify-center relative">
          {product?.mainPhotoUrl ? (
            <img
              src={product?.mainPhotoUrl}
              alt={product?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground" />
          )}

          {/* Stock Badge */}
          {!inStock && (
            <Badge variant="error" className="absolute top-2 right-2">
              Out of Stock
            </Badge>
          )}
        </div>

        <div className="p-4">
          {/* Product Name */}
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
            {product?.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {product?.description}
          </p>

          {/* Rating & Reviews - ✅ FIXED */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium">
                {product?.averageRating}
              </span>
              <span className="text-xs text-muted-foreground">
                ({product?.reviewCount})
              </span>
            </div>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {product?.totalSales} sold
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              {hasMultiplePrices ? (
                <p className="text-lg font-bold text-foreground">
                  ${minPrice?.toFixed(2)} - ${maxPrice?.toFixed(2)}
                </p>
              ) : (
                <p className="text-lg font-bold text-foreground">
                  ${minPrice?.toFixed(2)}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                addItem(product as any);
              }}
              disabled={!inStock}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
