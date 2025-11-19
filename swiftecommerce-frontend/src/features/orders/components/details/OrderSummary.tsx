import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Order } from '../../types/order.types';
import { CreditCard } from 'lucide-react';

interface OrderSummaryProps {
  order: Order;
}

export function OrderSummary({ order }: OrderSummaryProps) {
  const subtotal = order.totalAmount;
  const tax = subtotal * 0.1; // A rough estimation
  const total = subtotal + tax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-medium">${subtotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax & Fees:</span>
          <span className="font-medium">${tax.toFixed(2)}</span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-semibold text-foreground">Total:</span>
            <span className="font-bold text-foreground text-lg">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
