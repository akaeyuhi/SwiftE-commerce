import { useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { toast } from 'sonner';
import { useCartOrCreate, useCartMutations } from '../hooks/useCart';
import { useAuth } from '@/app/store';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useParams } from 'react-router-dom';
import { StoreCart } from '../components/StoreCart';
import { OrderSummary } from '../components/OrderSummary';
import { Card } from '@/shared/components/ui/Card.tsx';

export function CartPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clearDialog, setClearDialog] = useState(false);
  const [clearStoreDialog, setClearStoreDialog] = useState<string | null>(null);

  const { data: cart, isLoading, error } = useCartOrCreate(storeId!, user!.id);
  const { clearCart, removeItem, updateItem } = useCartMutations(
    storeId!,
    user!.id,
    cart?.id
  );

  const stores = useMemo(() => {
    if (!cart) return [];
    const storeMap = new Map<
      string,
      { id: string; name: string; items: any[] }
    >();
    cart.items.forEach((item) => {
      if (!storeMap.has(cart.store.id)) {
        storeMap.set(cart.store.id, {
          id: cart.store.id,
          name: cart.store.name,
          items: [],
        });
      }
      storeMap.get(cart.store.id)!.items.push(item);
    });
    return Array.from(storeMap.values());
  }, [cart]);

  const totalPrice = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );
  }, [cart]);

  const handleClearCart = () => {
    clearCart.mutate(undefined, {
      onSuccess: () => {
        setClearDialog(false);
        toast.success('Cart cleared');
      },
    });
  };

  const handleClearStoreCart = (storeId: string) => {
    // This logic needs to be implemented in the backend
    console.log('Clearing cart for store:', storeId);
    setClearStoreDialog(null);
    toast.info('Clearing individual store carts is not yet supported.');
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem.mutate(itemId);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItem.mutate({ itemId, data: { quantity } });
  };

  if (!cart || cart.items.length === 0) {
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
    <QueryLoader isLoading={isLoading} error={error}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Shopping Cart
              </h1>
              <p className="text-muted-foreground">
                {cart.items.length} items from {stores.length} store(s)
              </p>
            </div>
            <Button variant="outline" onClick={() => setClearDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {stores.map((store) => (
                <StoreCart
                  key={store.id}
                  store={store}
                  onClear={() => setClearStoreDialog(store.id)}
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
            open={clearDialog}
            onOpenChange={setClearDialog}
            title="Clear entire cart?"
            description="This will remove all items from all stores
          in your cart. This action cannot be undone."
            confirmText="Clear Cart"
            variant="danger"
            onConfirm={handleClearCart}
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
          />
        </div>
      </div>
    </QueryLoader>
  );
}
