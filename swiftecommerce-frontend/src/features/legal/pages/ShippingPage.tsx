import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Truck, Clock } from 'lucide-react';

export function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Shipping Information
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Learn about our shipping options and delivery times
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <Truck className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Standard Shipping
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                5-7 business days
              </p>
              <p className="text-sm text-muted-foreground">
                Free on orders over $50
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Clock className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Express Shipping
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                2-3 business days
              </p>
              <p className="text-sm text-muted-foreground">$9.99 flat rate</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Shipping Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Order Processing
              </h3>
              <p className="text-muted-foreground">
                Orders are processed within 1-2 business days. You&#39;ll
                receive a confirmation email once your order ships.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Tracking Information
              </h3>
              <p className="text-muted-foreground">
                Once shipped, you&#39;ll receive a tracking number to monitor
                your your package&#39;s journey.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                International Shipping
              </h3>
              <p className="text-muted-foreground">
                We ship to most countries worldwide. International delivery
                times vary by location (7-21 business days).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
