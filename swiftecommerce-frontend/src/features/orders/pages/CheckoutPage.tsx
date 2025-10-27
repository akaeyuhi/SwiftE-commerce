import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { useCart } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  // Shipping Address
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Valid phone number required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  country: z.string().min(2, 'Country is required'),
  // Payment
  cardNumber: z.string().min(16, 'Invalid card number'),
  cardName: z.string().min(3, 'Name on card required'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry (MM/YY)'),
  cvv: z.string().min(3, 'CVV required'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const { items, getStores, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const stores = getStores();
  const subtotal = getTotalPrice();
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'USA',
    },
  });

  if (items.length === 0) {
    navigate.toCart();
    return null;
  }

  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true);
    try {
      // TODO: API call to process payment and create orders
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Processing checkout:', data);

      // Clear cart and navigate to success
      clearCart();
      toast.success('Order placed successfully!');
      navigate.to('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="First Name"
                      error={errors.firstName}
                      required
                    >
                      <Input
                        {...register('firstName')}
                        error={!!errors.firstName}
                      />
                    </FormField>
                    <FormField
                      label="Last Name"
                      error={errors.lastName}
                      required
                    >
                      <Input
                        {...register('lastName')}
                        error={!!errors.lastName}
                      />
                    </FormField>
                  </div>

                  <FormField label="Email" error={errors.email} required>
                    <Input
                      {...register('email')}
                      type="email"
                      error={!!errors.email}
                    />
                  </FormField>

                  <FormField label="Phone" error={errors.phone} required>
                    <Input {...register('phone')} error={!!errors.phone} />
                  </FormField>

                  <FormField
                    label="Street Address"
                    error={errors.street}
                    required
                  >
                    <Input {...register('street')} error={!!errors.street} />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="City" error={errors.city} required>
                      <Input {...register('city')} error={!!errors.city} />
                    </FormField>
                    <FormField label="State" error={errors.state} required>
                      <Input {...register('state')} error={!!errors.state} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="ZIP Code" error={errors.zipCode} required>
                      <Input
                        {...register('zipCode')}
                        error={!!errors.zipCode}
                      />
                    </FormField>
                    <FormField label="Country" error={errors.country} required>
                      <Input
                        {...register('country')}
                        error={!!errors.country}
                      />
                    </FormField>
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    label="Card Number"
                    error={errors.cardNumber}
                    required
                  >
                    <Input
                      {...register('cardNumber')}
                      placeholder="1234 5678 9012 3456"
                      error={!!errors.cardNumber}
                    />
                  </FormField>

                  <FormField
                    label="Name on Card"
                    error={errors.cardName}
                    required
                  >
                    <Input
                      {...register('cardName')}
                      error={!!errors.cardName}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Expiry Date"
                      error={errors.expiryDate}
                      required
                    >
                      <Input
                        {...register('expiryDate')}
                        placeholder="MM/YY"
                        error={!!errors.expiryDate}
                      />
                    </FormField>
                    <FormField label="CVV" error={errors.cvv} required>
                      <Input
                        {...register('cvv')}
                        placeholder="123"
                        error={!!errors.cvv}
                      />
                    </FormField>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items by Store */}
                  {stores.map((store) => (
                    <div key={store.id} className="pb-4 border-b border-border">
                      <p className="font-semibold text-foreground mb-2">
                        {store.name}
                      </p>
                      <div className="space-y-2">
                        {store.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {item.productName} x{item.quantity}
                            </span>
                            <span className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="font-medium">
                        {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-lg font-bold mb-4">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      loading={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Place Order'}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    🔒 Secure checkout • Your payment information is encrypted
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
