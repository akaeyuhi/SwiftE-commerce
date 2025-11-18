import { useNavigate } from '@/shared/hooks/useNavigate';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { useEffect, useMemo } from 'react';
import { useUserMergedCarts } from '@/features/cart/hooks/useCart.ts';
import { useAuth } from '@/app/store';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader.tsx';
import { toast } from 'sonner';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { ShoppingCart } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card.tsx';

export function CheckoutPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    data: cartsData,
    isLoading,
    error,
  } = useUserMergedCarts(user?.id ?? '', {
    enabled: isAuthenticated,
  });

  const carts = useMemo(() => cartsData?.data ?? [], [cartsData]);
  const totalItems = useMemo(
    () => carts.reduce((sum, cart) => sum + cart.items.length, 0),
    [carts]
  );

  useEffect(() => {
    if (!isLoading && totalItems === 0) {
      toast.info('Your cart is empty. Add items to proceed to checkout.');
      navigate.toCart();
    }
  }, [isLoading, totalItems, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>
        <QueryLoader isLoading={isLoading} error={error}>
          {totalItems > 0 ? (
            <CheckoutForm carts={carts} />
          ) : (
            <Card>
              <EmptyState
                icon={ShoppingCart}
                title="Your cart is empty"
                description="You will be redirected shortly."
              />
            </Card>
          )}
        </QueryLoader>
      </div>
    </div>
  );
}
