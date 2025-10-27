import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';
import { FormField } from '@/shared/components/forms/FormField.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { Package, Truck, CheckCircle2 } from 'lucide-react';
import { mockOrders } from '@/shared/mocks/orders.mock.ts';

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const order = mockOrders.find((o) => o.orderNumber === orderNumber);
    setTrackedOrder(order || 'not-found');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">Track Order</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Enter your order number to track your package
        </p>

        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleTrack} className="space-y-4">
              <FormField label="Order Number" required>
                <Input
                  placeholder="e.g., ORD-2024-001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
              </FormField>
              <Button type="submit">Track Order</Button>
            </form>
          </CardContent>
        </Card>

        {trackedOrder === 'not-found' && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Order not found. Please check your order number and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {trackedOrder && trackedOrder !== 'not-found' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{trackedOrder.orderNumber}</CardTitle>
                <Badge
                  variant={
                    trackedOrder.status === 'delivered' ? 'success' : 'default'
                  }
                >
                  {trackedOrder.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Ordered on{' '}
                  {new Date(trackedOrder.createdAt).toLocaleDateString()}
                </p>
                <p className="font-semibold text-foreground">
                  {trackedOrder.storeName}
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="h-8 w-8 rounded-full
                    bg-success/20 flex items-center justify-center"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div className="w-0.5 h-12 bg-border" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Order Placed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(trackedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        trackedOrder.status !== 'pending'
                          ? 'bg-success/20'
                          : 'bg-muted'
                      }`}
                    >
                      <Package
                        className={`h-4 w-4 ${
                          trackedOrder.status !== 'pending'
                            ? 'text-success'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    {(trackedOrder.status === 'shipped' ||
                      trackedOrder.status === 'delivered') && (
                      <div className="w-0.5 h-12 bg-border" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Processing</p>
                    <p className="text-sm text-muted-foreground">
                      Your order is being prepared
                    </p>
                  </div>
                </div>

                {(trackedOrder.status === 'shipped' ||
                  trackedOrder.status === 'delivered') && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className="h-8 w-8 rounded-full
                      bg-success/20 flex items-center justify-center"
                      >
                        <Truck className="h-4 w-4 text-success" />
                      </div>
                      {trackedOrder.status === 'delivered' && (
                        <div className="w-0.5 h-12 bg-border" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Shipped</p>
                      <p className="text-sm text-muted-foreground">
                        Your order is on the way
                      </p>
                    </div>
                  </div>
                )}

                {trackedOrder.status === 'delivered' && (
                  <div className="flex gap-4">
                    <div
                      className="h-8 w-8 rounded-full bg-success/20
                    flex items-center justify-center"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Delivered</p>
                      <p className="text-sm text-muted-foreground">
                        Package delivered successfully
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
