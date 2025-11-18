import { useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { toast } from 'sonner';
import { useUserMergedCarts, useCartMutations } from '../hooks/useCart';
import { useAuth } from '@/app/store';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreCart } from '../components/StoreCart';
import { OrderSummary } from '../components/OrderSummary';
import { Card } from '@/shared/components/ui/Card.tsx';
import { CartItem } from '@/features/cart/types/cart.types.ts';

export function CartPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [clearAllDialog, setClearAllDialog] = useState(false);
  const [clearStoreDialog, setClearStoreDialog] = useState<string | null>(null);

  const {
    data: cartsData,
    isLoading,
    error,
  } = useUserMergedCarts(user?.id ?? '', { enabled: isAuthenticated });
  const { clearCart, removeItem, updateQuantity } = useCartMutations(
    user?.id ?? ''
  );

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
  const totalItemsCount = useMemo(
    () => allItems.reduce((sum, item) => sum + item.quantity, 0),
    [allItems]
  );

  const totalPrice = useMemo(
    () =>
      allItems.reduce(
        (sum, item) => sum + item.variant.price * item.quantity,
        0
      ),
    [allItems]
  );

  const handleClearAllCarts = () => {
    const promises = carts.map((cart) => clearCart.mutateAsync(cart.store.id));
    toast.promise(Promise.all(promises), {
      loading: 'Clearing all items from your carts...',
      success: 'All carts have been cleared.',
      error: 'Failed to clear all carts.',
      finally: () => setClearAllDialog(false),
    });
  };

  const handleClearStoreCart = (storeId: string) => {
    clearCart.mutate(storeId, {
      onSuccess: () => {
        toast.success('Store cart cleared.');
        setClearStoreDialog(null);
      },
      onError: () => {
        toast.error('Failed to clear store cart.');
      },
    });
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem.mutate({
      storeId: item.cart.store.id,
      cartId: item.cart.id,
      itemId: item.id,
    });
  };

  const handleUpdateQuantity = (item: CartItem, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(item);
      return;
    }
    updateQuantity.mutate({
      storeId: item.cart.store.id,
      cartId: item.cart.id,
      itemId: item.id,
      quantity,
    });
  };

  if (!allItems.length) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Start shopping to add items to your cart."
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
    <QueryLoader isLoading={isLoading} error={error}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Shopping Cart
              </h1>
              <p className="text-muted-foreground">
                {totalItemsCount} items from {carts.length} store(s)
              </p>
            </div>
            <Button variant="outline" onClick={() => setClearAllDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Carts
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {carts.map((cart) => (
                <StoreCart
                  key={cart.store.id}
                  store={{
                    id: cart.store.id,
                    name: cart.store.name,
                    items: cart.items,
                  }}
                  onClear={() => setClearStoreDialog(cart.store.id)}
                  onRemoveItem={handleRemoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))}
            </div>

            <div className="lg:col-span-1">
              <OrderSummary totalPrice={totalPrice} />
            </div>
          </div>

          <ConfirmDialog
            open={clearAllDialog}
            onOpenChange={setClearAllDialog}
            title="Clear all carts?"
            description="This will remove all items from all stores in your cart.
          This action cannot be undone."
            confirmText="Clear All"
            variant="danger"
            onConfirm={handleClearAllCarts}
            loading={clearCart.isPending}
          />

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
            loading={clearCart.isPending}
          />
        </div>
      </div>
    </QueryLoader>
  );
}
