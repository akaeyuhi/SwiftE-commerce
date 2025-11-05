import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { mockProducts } from '@/shared/mocks/products.mock';
import { Heart, ShoppingCart, X, Package, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/app/store';
import { buildRoute } from '@/app/routes/routes';
import { Link } from '@/shared/components/ui/Link';

export function WishlistPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState(mockProducts.slice(0, 3));

  const removeFromWishlist = (productId: string) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
    toast.success('Removed from wishlist');
  };

  const addToCart = (productId: string) => {
    const product = wishlistItems.find((product) => product.id === productId);
    addItem(product as any);
    toast.success('Added to cart!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Wishlist
          </h1>
          <p className="text-muted-foreground">
            {wishlistItems.length}{' '}
            {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <Card>
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              description="Start adding products you love to your wishlist"
              action={{
                label: 'Browse Products',
                onClick: () => navigate.toProducts(),
              }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((product) => {
              const minPrice = Math.min(
                ...product.variants.map((v) => v.price)
              );
              const inStock = product.variants.some(
                (v) => v.inventory.quantity > 0
              );
              return (
                <Card key={product.id} className="relative group">
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-4 right-4 z-10 h-8 w-8
                    bg-background/80 backdrop-blur-sm rounded-full
                    flex items-center justify-center opacity-0
                    group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CardContent className="p-0">
                    <Link to={buildRoute.productDetail(product.id)}>
                      <div
                        className="aspect-square bg-muted flex
                      items-center justify-center cursor-pointer"
                      >
                        <Package className="h-12 w-12 text-muted-foreground" />
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
                            {product.averageRating}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({product.reviewCount})
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <p className="text-lg font-bold text-foreground">
                          ${minPrice.toFixed(2)}
                        </p>
                        <Badge
                          variant={inStock ? 'success' : 'error'}
                          className="text-xs"
                        >
                          {inStock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => addToCart(product.id)}
                        disabled={!inStock}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
