import { Link } from '@/shared/components/ui/Link';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { buildRoute } from '@/app/routes/routes';
import { Like } from '@/features/likes/types/likes.types';
import { toast } from 'sonner';
import { Package, ShoppingCart, Star, X } from 'lucide-react';
import { useLikeMutations } from '@/features/likes/hooks/useLikes';
import { useAuth } from '@/app/store';
import { useCartMutations } from '@/features/cart/hooks/useCart.ts';

interface WishlistProductCardProps {
  like: Like;
}

export function WishlistProductCard({ like }: WishlistProductCardProps) {
  const { user } = useAuth();
  const { addItem } = useCartMutations(user!.id);
  const { removeLike } = useLikeMutations(user!.id);

  const product = like.product;

  if (!product) {
    return null;
  }

  const handleRemove = () => {
    removeLike.mutate(like.id);
  };

  const handleAddToCart = () => {
    if (product.variants && product.variants.length > 0) {
      const defaultVariant = product.variants[0]!;
      addItem.mutate({
        storeId: product.storeId,
        item: {
          variantId: defaultVariant.id,
          quantity: 1,
        },
      });
    } else {
      toast.error('This product has no variants to add.');
    }
  };

  const minPrice = Math.min(...(product.variants?.map((v) => v.price) || [0]));
  const inStock = product.variants?.some((v) => v.inventory.quantity > 0);

  return (
    <Card className="relative group">
      <button
        onClick={handleRemove}
        className="absolute top-4 right-4 z-10 h-8 w-8
        bg-background/80 backdrop-blur-sm rounded-full
        flex items-center justify-center opacity-0
        group-hover:opacity-100 transition-opacity"
        aria-label="Remove from wishlist"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="p-0">
        <Link to={buildRoute.productDetail(product.id)}>
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
          </div>
        </Link>

        <div className="p-4">
          <Link to={buildRoute.productDetail(product.id)}>
            <h3
              className="font-semibold text-foreground mb-2
            line-clamp-2 cursor-pointer hover:text-primary"
            >
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium">
                {product.averageRating?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.reviewCount || 0})
            </span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-bold text-foreground">
              ${minPrice.toFixed(2)}
            </p>
            <Badge variant={inStock ? 'success' : 'error'} className="text-xs">
              {inStock ? 'In Stock' : 'Out of Stock'}
            </Badge>
          </div>

          <Button
            className="w-full"
            size="sm"
            onClick={handleAddToCart}
            disabled={
              !inStock || !product.variants || product.variants.length === 0
            }
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
