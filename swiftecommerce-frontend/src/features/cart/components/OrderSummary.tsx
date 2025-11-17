import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowRight } from 'lucide-react';

interface OrderSummaryProps {
  totalPrice: number;
}

export function OrderSummary({ totalPrice }: OrderSummaryProps) {
  const navigate = useNavigate();

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">${totalPrice.toFixed(2)}</span>
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
  );
}
