import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { mockOrders, MockOrder } from '@/shared/mocks/orders.mock';
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

export function StoreOrdersPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter orders for this store
  const storeOrders = mockOrders.filter((order) => order.storeId === storeId);

  const filteredOrders = storeOrders.filter((order) => {
    const matchesSearch = order.orderNumber
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      title: 'Total Orders',
      value: storeOrders.length,
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: storeOrders.filter((o) => o.status === 'pending').length,
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Delivered',
      value: storeOrders.filter((o) => o.status === 'delivered').length,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Revenue',
      value: `$${storeOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  const getStatusIcon = (status: MockOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Package className="h-5 w-5" />;
      case 'processing':
        return <Package className="h-5 w-5" />;
      case 'shipped':
        return <Truck className="h-5 w-5" />;
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getStatusVariant = (status: MockOrder['status']) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleUpdateStatus = (
    orderId: string,
    newStatus: MockOrder['status']
  ) => {
    // TODO: API call
    toast.success(`Order status updated to ${newStatus} ${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Orders Management
        </h1>
        <p className="text-muted-foreground">
          Manage and fulfill customer orders
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description={
              searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'No orders yet'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                {/* Header */}
                <div
                  className="flex flex-col md:flex-row
                md:items-center justify-between mb-4 pb-4 border-b border-border"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {order.orderNumber}
                      </h3>
                      <Badge variant={getStatusVariant(order.status) as any}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <p className="text-2xl font-bold text-foreground">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.productName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.variantSku} • Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Shipping Address */}
                <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded">
                  <p className="font-medium text-foreground mb-1">Ship to:</p>
                  <p>
                    {order.shippingAddress.street}, {order.shippingAddress.city}
                    , {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Select
                    value={order.status}
                    onValueChange={(value) =>
                      handleUpdateStatus(order.id, value as MockOrder['status'])
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Print Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
