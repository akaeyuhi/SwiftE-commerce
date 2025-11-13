import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { mockOrders } from '@/shared/mocks/orders.mock';
import { TrackOrderForm } from '../components/tracking/TrackOrderForm';
import { OrderTimeline } from '../components/tracking/OrderTimeline';
import { Order } from '../types/order.types';

// TODO: Implement a public API endpoint to track orders by number.
// The current implementation uses mock data as a placeholder.
// A possible endpoint could be `GET /orders/track/{orderNumber}`.

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | 'not-found' | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const order = mockOrders.find((o) => o.orderNumber === orderNumber);
      setTrackedOrder((order as any) || 'not-found');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">Track Order</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Enter your order number to track your package
        </p>

        <TrackOrderForm
          orderNumber={orderNumber}
          onOrderNumberChange={setOrderNumber}
          onTrack={handleTrack}
          isLoading={isLoading}
        />

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
          <OrderTimeline order={trackedOrder} />
        )}
      </div>
    </div>
  );
}
