import { useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { CartItem } from '@/features/cart/types/cart.types';
import { Loader2 } from 'lucide-react';
import { Separator } from '@radix-ui/react-select';

interface CheckoutSummaryProps {
  items: CartItem[];
  isProcessing: boolean;
}

export function CheckoutSummary({ items, isProcessing }: CheckoutSummaryProps) {
  const totalPrice = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0),
    [items]
  );

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <img
                  src={item.variant.product.mainPhotoUrl}
                  alt={item.variant.product.name}
                  className="h-10 w-10 rounded object-cover"
                />
                <div>
                  <p className="font-medium text-foreground truncate max-w-[150px]">
                    {item.variant.product.name}
                  </p>
                  <p className="text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="font-medium">
                ${(item.variant.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">FREE</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">Calculated at next step</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>

        <Button
          size="lg"
          className="w-full"
          type="submit"
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Place Order
        </Button>
      </CardContent>
    </Card>
  );
}
