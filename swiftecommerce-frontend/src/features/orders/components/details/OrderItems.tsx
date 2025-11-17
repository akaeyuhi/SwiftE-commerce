import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { OrderItem } from '../../types/order.types';
import { Badge } from '@/shared/components/ui/Badge';
import { Package } from 'lucide-react';

interface OrderItemsProps {
  items: OrderItem[];
}

export function OrderItems({ items }: OrderItemsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Order Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 pb-4 border-b border-border last:border-0"
          >
            {item.product ? (
              <img
                src={item.product?.mainPhotoUrl}
                className="h-20 w-20 bg-muted rounded flex items-center justify-center"
                alt={item.productName}
              />
            ) : (
              <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {item.productName}
              </h3>
              <p className="text-sm text-muted-foreground">
                SKU: {item.sku} • Qty: {item.quantity}
              </p>
              {item.variant?.attributes && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(item.variant.attributes).map(
                    ([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {value}
                      </Badge>
                    )
                  )}
                </div>
              )}
            </div>
            <p className="font-semibold text-foreground">
              ${parseFloat(String(item.lineTotal)).toFixed(2)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
