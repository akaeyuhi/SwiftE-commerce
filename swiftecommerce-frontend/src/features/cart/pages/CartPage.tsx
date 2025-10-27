import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useCart } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Store,
  ArrowRight,
} from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { toast } from 'sonner';

export function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    clearStoreCart,
    getStores,
    getTotalPrice,
  } = useCart();
  const navigate = useNavigate();
  const [clearDialog, setClearDialog] = useState(false);
  const [clearStoreDialog, setClearStoreDialog] = useState<string | null>(null);

  const stores = getStores();
  const totalPrice = getTotalPrice();

  const handleClearCart = () => {
    clearCart();
    setClearDialog(false);
    toast.success('Cart cleared');
  };

  const handleClearStoreCart = (storeId: string) => {
    clearStoreCart(storeId);
    setClearStoreDialog(null);
    toast.success('Store cart cleared');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Start shopping to add items to your cart"
            action={{
              label: 'Browse Products',
              onClick: () => navigate.toProducts(),
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground">
              {items.length} items from {stores.length} store(s)
            </p>
          </div>
          <Button variant="outline" onClick={() => setClearDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items by Store */}
          <div className="lg:col-span-2 space-y-6">
            {stores.map((store) => {
              const storeTotal = store.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );

              return (
                <Card key={store.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-primary" />
                        <CardTitle>{store.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClearStoreDialog(store.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {store.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 border border-border rounded-lg"
                      >
                        {/* Image */}
                        <div
                          className="h-24 w-24 bg-muted rounded-lg
                        flex items-center justify-center flex-shrink-0"
                        >
                          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {item.productName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                SKU: {item.variantSku}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-error p-2"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Attributes */}
                          {item.attributes &&
                            Object.keys(item.attributes).length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {Object.entries(item.attributes).map(
                                  ([key, value]) => (
                                    <Badge key={key} variant="secondary">
                                      {key}: {value}
                                    </Badge>
                                  )
                                )}
                              </div>
                            )}

                          {/* Price & Quantity */}
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-foreground">
                              ${(item.price * item.quantity).toFixed(2)}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ${item.price.toFixed(2)} each
                              </span>
                            </p>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 rounded border border-border flex items-center
                                justify-center hover:bg-muted disabled:opacity-50
                                disabled:cursor-not-allowed"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="text-lg font-semibold w-12 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={item.quantity >= item.maxQuantity}
                                className="h-8 w-8 rounded border border-border flex items-center
                                justify-center hover:bg-muted disabled:opacity-50
                                disabled:cursor-not-allowed"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {item.quantity >= item.maxQuantity && (
                            <p className="text-xs text-warning mt-2">
                              Maximum quantity reached
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Store Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="font-semibold text-foreground">
                        Store Subtotal:
                      </span>
                      <span className="text-xl font-bold text-foreground">
                        ${storeTotal.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        // TODO: Create order for this store
                        toast.info(
                          'Checkout for individual stores coming soon!'
                        );
                      }}
                    >
                      Checkout from {store.name}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => navigate.toCheckout()}
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Secure checkout • Free shipping on orders over $50
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Clear Cart Dialog */}
        <ConfirmDialog
          open={clearDialog}
          onOpenChange={setClearDialog}
          title="Clear entire cart?"
          description="This will remove all items from all stores in your cart.
          This action cannot be undone."
          confirmText="Clear Cart"
          variant="danger"
          onConfirm={handleClearCart}
        />

        {/* Clear Store Cart Dialog */}
        <ConfirmDialog
          open={!!clearStoreDialog}
          onOpenChange={(open) => !open && setClearStoreDialog(null)}
          title="Clear store cart?"
          description="This will remove all items from this store. This action cannot be undone."
          confirmText="Clear"
          variant="danger"
          onConfirm={() =>
            clearStoreDialog && handleClearStoreCart(clearStoreDialog)
          }
        />
      </div>
    </div>
  );
}
