import { useCart } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { useEffect } from 'react';

export function CheckoutPage() {
  const { items } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) {
      navigate.toCart();
    }
  }, [items, navigate]);

  if (items.length === 0) {
    return null; // Or a loading indicator
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>
        <CheckoutForm />
      </div>
    </div>
  );
}
