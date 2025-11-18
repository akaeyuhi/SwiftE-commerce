import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useOrderMutations } from '../../hooks/useOrderMutations';
import {
  checkoutSchema,
  CheckoutFormData,
} from '@/lib/validations/checkout.schemas.ts';
import { CreateOrderDto } from '../../types/order.types';
import { ShippingForm } from './ShippingForm';
import { PaymentForm } from './PaymentForm';
import { CheckoutSummary } from './CheckoutSummary';
import { ShoppingCart } from '@/features/cart/types/cart.types';
import { useCartMutations } from '@/features/cart/hooks/useCart';
import { useMemo } from 'react';

interface CheckoutFormProps {
  carts: ShoppingCart[];
}

export function CheckoutForm({ carts }: CheckoutFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createOrder } = useOrderMutations();
  const { clearCart } = useCartMutations(user?.id ?? '');

  const methods = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'USA',
      email: user?.email ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  });

  const allItems = useMemo(() => carts.flatMap((cart) => cart.items), [carts]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      toast.error('You must be logged in to place an order.');
      return;
    }
    if (carts.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    const orderPromises = carts.map((cart) => {
      const totalAmount = cart.items.reduce(
        (sum, item) => sum + item.variant.price * item.quantity,
        0
      );

      const orderDto: CreateOrderDto = {
        storeId: cart.store.id,
        userId: user.id,
        totalAmount,
        shipping: {
          firstName: data.firstName,
          lastName: data.lastName,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          phone: data.phone,
        },
        items: cart.items.map((item) => ({
          productId: item.variant.product.id,
          variantId: item.variant.id,
          productName: item.variant.product.name,
          sku: item.variant.sku,
          unitPrice: item.variant.price,
          quantity: item.quantity,
          lineTotal: item.variant.price * item.quantity,
        })),
      };
      return createOrder.mutateAsync({
        storeId: cart.store.id,
        userId: user.id,
        data: orderDto,
      });
    });

    try {
      toast.promise(Promise.all(orderPromises), {
        loading: 'Placing your order...',
        success: 'Order placed successfully!',
        error: 'There was an issue placing your order.',
      });

      const clearPromises = carts.map((cart) =>
        clearCart.mutateAsync(cart.store.id)
      );

      toast.promise(Promise.all(clearPromises), {
        loading: 'Clearing your cart...',
        success: 'Cart cleared!',
        error: 'Failed to clear cart.',
      });

      navigate.toOrders();
    } catch (error: any) {
      // Toast promise handles errors, but we can log them here if needed
      console.error('Order placement failed:', error);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ShippingForm />
            <PaymentForm />
          </div>
          <div className="lg:col-span-1">
            <CheckoutSummary
              items={allItems}
              isProcessing={createOrder.isPending}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
