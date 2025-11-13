import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  ShoppingCart,
  MoreVertical,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  storeName: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  createdAt: string;
  updatedAt: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  shippingAddress: string;
}

export function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      customer: 'John Doe',
      email: 'john@example.com',
      storeName: 'Tech Haven',
      totalAmount: 1299.99,
      status: 'delivered',
      items: 3,
      createdAt: '2024-03-15',
      updatedAt: '2024-03-18',
      paymentStatus: 'paid',
      shippingAddress: '123 Main St, New York, NY 10001',
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      customer: 'Jane Smith',
      email: 'jane@example.com',
      storeName: 'Fashion Store',
      totalAmount: 599.5,
      status: 'shipped',
      items: 5,
      createdAt: '2024-03-18',
      updatedAt: '2024-03-19',
      paymentStatus: 'paid',
      shippingAddress: '456 Oak Ave, Los Angeles, CA 90001',
    },
    {
      id: '3',
      orderNumber: 'ORD-2024-003',
      customer: 'Bob Wilson',
      email: 'bob@example.com',
      storeName: 'Home Decor',
      totalAmount: 349.99,
      status: 'processing',
      items: 2,
      createdAt: '2024-03-19',
      updatedAt: '2024-03-19',
      paymentStatus: 'paid',
      shippingAddress: '789 Pine Rd, Chicago, IL 60601',
    },
    {
      id: '4',
      orderNumber: 'ORD-2024-004',
      customer: 'Alice Brown',
      email: 'alice@example.com',
      storeName: 'Tech Haven',
      totalAmount: 2399.99,
      status: 'pending',
      items: 8,
      createdAt: '2024-03-20',
      updatedAt: '2024-03-20',
      paymentStatus: 'pending',
      shippingAddress: '321 Elm St, Houston, TX 77001',
    },
  ]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment =
      filterPayment === 'all' || order.paymentStatus === filterPayment;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'highest':
        return b.totalAmount - a.totalAmount;
      case 'lowest':
        return a.totalAmount - b.totalAmount;
      default:
        return 0;
    }
  });

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, updatedAt: new Date().toISOString() }
          : o
      )
    );
    toast.success(`Order status updated to ${newStatus}`);
  };

  const handleMarkAsPaid = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid' } : o))
    );
    toast.success('Payment marked as received');
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
      );
      toast.success('Order cancelled');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Statistics
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    unpaidOrders: orders.filter((o) => o.paymentStatus !== 'paid').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Order Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and manage all platform orders
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalOrders}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pendingOrders}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Orders</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.unpaidOrders}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Amount</SelectItem>
                <SelectItem value="lowest">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground">
                    Order
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Customer
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Store
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Payment
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Date
                  </th>
                  <th className="text-right p-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items} items
                      </p>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-foreground">
                          {order.customer}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {order.storeName}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground">
                        ${order.totalAmount.toFixed(2)}
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={getStatusBadgeVariant(order.status) as any}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          getPaymentBadgeVariant(order.paymentStatus) as any
                        }
                      >
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>

                          {order.status !== 'cancelled' && (
                            <>
                              {order.status !== 'delivered' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const nextStatus: Record<
                                      string,
                                      Order['status']
                                    > = {
                                      pending: 'processing',
                                      processing: 'shipped',
                                      shipped: 'delivered',
                                    };
                                    if (nextStatus[order.status]) {
                                      handleUpdateStatus(
                                        order.id,
                                        nextStatus[order.status]!
                                      );
                                    }
                                  }}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  Update Status
                                </DropdownMenuItem>
                              )}

                              {order.paymentStatus !== 'paid' && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(order.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleCancelOrder(order.id)}
                                className="text-error"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {sortedOrders.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No orders found matching your criteria
          </CardContent>
        </Card>
      )}
    </div>
  );
}
