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
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  Store,
  MoreVertical,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminStore {
  id: string;
  name: string;
  owner: string;
  email: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  totalProducts: number;
  totalOrders: number;
  revenue: number;
  createdAt: string;
  verified: boolean;
}

export function AdminStoresPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [stores, setStores] = useState<AdminStore[]>([
    {
      id: '1',
      name: 'Tech Haven',
      owner: 'John Doe',
      email: 'john@techhaven.com',
      status: 'active',
      totalProducts: 156,
      totalOrders: 1234,
      revenue: 125000,
      createdAt: '2024-01-15',
      verified: true,
    },
    {
      id: '2',
      name: 'Fashion Store',
      owner: 'Jane Smith',
      email: 'jane@fashion.com',
      status: 'pending',
      totalProducts: 45,
      totalOrders: 0,
      revenue: 0,
      createdAt: '2024-03-10',
      verified: false,
    },
    {
      id: '3',
      name: 'Home Decor',
      owner: 'Mike Johnson',
      email: 'mike@homedecor.com',
      status: 'suspended',
      totalProducts: 89,
      totalOrders: 456,
      revenue: 45000,
      createdAt: '2024-02-20',
      verified: true,
    },
  ]);

  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || store.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleApproveStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId ? { ...s, status: 'active', verified: true } : s
      )
    );
    toast.success('Store approved');
  };

  const handleRejectStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, status: 'rejected' } : s))
    );
    toast.success('Store rejected');
  };

  const handleSuspendStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, status: 'suspended' } : s))
    );
    toast.success('Store suspended');
  };

  const handleActivateStore = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, status: 'active' } : s))
    );
    toast.success('Store activated');
  };

  const handleDeleteStore = (storeId: string) => {
    if (confirm('Are you sure you want to delete this store?')) {
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      toast.success('Store deleted');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'rejected':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Store Management
        </h1>
        <p className="text-muted-foreground">
          Manage stores, approvals, and monitoring
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stores</p>
                <p className="text-2xl font-bold text-foreground">
                  {stores.length}
                </p>
              </div>
              <Store className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">
                  {stores.filter((s) => s.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">
                  {stores.filter((s) => s.status === 'pending').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-error">
                  {stores.filter((s) => s.status === 'suspended').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-error" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground">
                    Store
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Owner
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Products
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Orders
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Revenue
                  </th>
                  <th className="text-right p-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {store.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Since {new Date(store.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-foreground">{store.owner}</p>
                        <p className="text-xs text-muted-foreground">
                          {store.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={getStatusBadgeVariant(store.status) as any}
                      >
                        {store.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-foreground">
                      {store.totalProducts}
                    </td>
                    <td className="p-4 text-foreground">{store.totalOrders}</td>
                    <td className="p-4 text-foreground">
                      ${store.revenue.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate.to(`/admin/stores/${store.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>

                          {store.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApproveStore(store.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Store
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRejectStore(store.id)}
                                className="text-error"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Store
                              </DropdownMenuItem>
                            </>
                          )}

                          {store.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleSuspendStore(store.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Suspend Store
                            </DropdownMenuItem>
                          )}

                          {store.status === 'suspended' && (
                            <DropdownMenuItem
                              onClick={() => handleActivateStore(store.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate Store
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => handleDeleteStore(store.id)}
                            className="text-error"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Store
                          </DropdownMenuItem>
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
    </div>
  );
}
