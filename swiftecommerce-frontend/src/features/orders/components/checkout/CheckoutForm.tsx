import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useCart, useAuth } from '@/app/store';
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

export function CheckoutForm() {
  const { user } = useAuth();
  const { items, getStores, clearCart } = useCart();
  const navigate = useNavigate();

  const { createOrder } = useOrderMutations();

  const methods = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'USA',
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      toast.error('You must be logged in to place an order.');
      return;
    }

    const stores = getStores();
    const orderPromises = stores.map((store) => {
      const orderDto: CreateOrderDto = {
        shipping: {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.addressLine1,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          phone: data.phone,
        },
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.variantSku,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
      };
      return createOrder.mutateAsync({
        storeId: store.id,
        userId: user.id,
        data: orderDto,
      });
    });

    try {
      await Promise.all(orderPromises);
      clearCart();
      toast.success('Your order has been placed successfully!');
      navigate.toOrders();
    } catch (error: any) {
      toast.error(error.message || 'There was an issue placing your order.');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ShippingForm />
            <PaymentForm />
          </div>
          <div className="lg:col-span-1">
            <CheckoutSummary isProcessing={createOrder.isPending} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
