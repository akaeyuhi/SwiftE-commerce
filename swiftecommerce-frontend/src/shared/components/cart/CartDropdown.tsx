import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { useAuth, useCart } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import {
  useCartMutations,
  useUserMergedCarts,
} from '@/features/cart/hooks/useCart';
import { useMemo } from 'react';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader.tsx';
import { CartItem } from '@/features/cart/types/cart.types.ts';
import { Store } from '@/features/stores/types/store.types.ts';

export function CartDropdown() {
  const { isCartOpen, setCartOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    data: cartsData,
    isLoading,
    error,
  } = useUserMergedCarts(user?.id ?? '', {
    enabled: isAuthenticated && isCartOpen,
  });
  const { removeItem, updateQuantity } = useCartMutations(user?.id ?? '');

  const carts = useMemo(() => cartsData?.data ?? [], [cartsData]);
  const allItems = useMemo(
    () =>
      carts.flatMap((cart) =>
        cart.items.map((item) => ({
          ...item,
          store: cart.store,
        }))
      ),
    [carts]
  );

  const totalItems = useMemo(
    () => allItems.reduce((sum, item) => sum + item.quantity, 0),
    [allItems]
  );

  const totalPrice = useMemo(
    () =>
      allItems.reduce(
        (sum, item) => sum + item.variant?.price * item.quantity,
        0
      ),
    [allItems]
  );

  const handleRemoveItem = (item: CartItem & { store: Store }) => {
    removeItem.mutate({
      storeId: item.store.id,
      cartId: item.cartId,
      itemId: item.id,
    });
  };

  const handleUpdateQuantity = (
    item: CartItem & { store: Store },
    quantity: number
  ) => {
    if (quantity < 1) {
      handleRemoveItem(item);
      return;
    }
    updateQuantity.mutate({
      storeId: item.store.id,
      cartId: item.cartId,
      itemId: item.id,
      quantity,
    });
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge
              variant="error"
              className="absolute -top-1 -right-1 h-5 w-5
              rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalItems}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({totalItems} items)</SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-180px)] mt-4">
          <QueryLoader isLoading={isLoading} error={error}>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {!carts || allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add some products to get started
                  </p>
                  <Button onClick={() => setCartOpen(false)}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                allItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Image */}
                        {item.variant.product?.mainPhotoUrl ? (
                          <img
                            src={item.variant.product.mainPhotoUrl}
                            alt={item.variant.productName}
                            className="h-20 w-20 bg-muted rounded-lg
                      flex items-center justify-center flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="h-20 w-20 bg-muted rounded-lg
                      flex items-center justify-center flex-shrink-0"
                          >
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground text-sm truncate">
                                {item.variant?.productName}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {item.store.name}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="text-muted-foreground hover:text-error p-1"
                              disabled={removeItem.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Attributes */}
                          {item.variant?.attributes &&
                            Object.keys(item.variant.attributes).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {Object.values(item.variant.attributes).map(
                                  (value, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {value}
                                    </Badge>
                                  )
                                )}
                              </div>
                            )}

                          {/* Price & Quantity */}
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">
                              ${item.variant?.price.toFixed(2)}
                            </p>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item, item.quantity - 1)
                                }
                                disabled={
                                  item.quantity <= 1 || updateQuantity.isPending
                                }
                                className="h-6 w-6 rounded border border-border flex
                              items-center justify-center hover:bg-muted disabled:opacity-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-sm font-medium w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item, item.quantity + 1)
                                }
                                disabled={updateQuantity.isPending}
                                className="h-6 w-6 rounded border border-border flex
                              items-center justify-center hover:bg-muted disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Footer */}
            {allItems.length > 0 && (
              <div className="border-t border-border pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setCartOpen(false);
                    navigate.toCart();
                  }}
                >
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </QueryLoader>
        </div>
      </SheetContent>
    </Sheet>
  );
}
