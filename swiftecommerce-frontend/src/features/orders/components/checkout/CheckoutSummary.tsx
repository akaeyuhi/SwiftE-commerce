import { useCart } from '@/app/store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';

interface CheckoutSummaryProps {
  isProcessing: boolean;
}

export function CheckoutSummary({ isProcessing }: CheckoutSummaryProps) {
  const { getStores, getTotalPrice } = useCart();

  const stores = getStores();
  const subtotal = getTotalPrice();
  const shipping = subtotal > 50 ? 0 : 9.99; // Example shipping logic
  const tax = subtotal * 0.08; // Example 8% tax
  const total = subtotal + shipping + tax;

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.map((store) => (
          <div key={store.id} className="pb-4 border-b border-border">
            <p className="font-semibold text-foreground mb-2">{store.name}</p>
            <div className="space-y-2">
              {store.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
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

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
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
  );
}
