import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { mockOrders } from '@/shared/mocks/orders.mock';
import { useCart } from '@/app/store';
import {
  Package,
  MapPin,
  CreditCard,
  ArrowLeft,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const order = mockOrders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Order Not Found
            </h2>
            <Button onClick={() => navigate.toOrders()}>Back to Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBuyAgain = () => {
    // ✅ Add all items to cart
    order.items.forEach((item) => {
      addItem({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantSku: item.variantSku,
        price: item.price,
        quantity: item.quantity,
        maxQuantity: item.quantity + 100,
        storeId: order.storeId,
        storeName: order.storeName,
      });
    });
    toast.success(`${order.items.length} items added to cart!`);
    navigate.toCart();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <button
          onClick={() => navigate.toOrders()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={order.status === 'delivered' ? 'success' : 'default'}
            className="text-lg px-4 py-2"
          >
            {order.status}
          </Badge>
        </div>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 pb-4 border-b border-border last:border-0"
              >
                <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {item.productName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.variantSku} • Qty: {item.quantity}
                  </p>
                  {item.attributes && (
                    <div className="flex gap-1 mt-1">
                      {Object.entries(item.attributes).map(([key, value]) => (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="text-xs"
                        >
                          {value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <p className="font-semibold text-foreground">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}

            {order.status === 'delivered' && (
              <Button
                onClick={handleBuyAgain}
                variant="outline"
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Again
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{order.shippingAddress.street}</p>
              <p className="text-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </p>
            </CardContent>
          </Card>

          {/* Order Summary */}
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
                <span className="font-medium">
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium">
                  ${order.shipping.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">${order.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total:</span>
                  <span className="font-bold text-foreground text-lg">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
