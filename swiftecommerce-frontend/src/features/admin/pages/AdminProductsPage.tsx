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
  Package,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminProduct {
  id: string;
  name: string;
  storeName: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'flagged' | 'pending_review';
  createdAt: string;
  sales: number;
}

export function AdminProductsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [products, setProducts] = useState<AdminProduct[]>([
    {
      id: '1',
      name: 'Wireless Headphones Pro',
      storeName: 'Tech Haven',
      category: 'Electronics',
      price: 299.99,
      stock: 45,
      status: 'active',
      createdAt: '2024-01-15',
      sales: 156,
    },
    {
      id: '2',
      name: 'Vintage T-Shirt',
      storeName: 'Fashion Store',
      category: 'Clothing',
      price: 29.99,
      stock: 0,
      status: 'inactive',
      createdAt: '2024-02-20',
      sales: 89,
    },
    {
      id: '3',
      name: 'Smart Watch X',
      storeName: 'Tech Haven',
      category: 'Electronics',
      price: 399.99,
      stock: 23,
      status: 'flagged',
      createdAt: '2024-03-01',
      sales: 234,
    },
  ]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.storeName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || product.status === filterStatus;
    const matchesCategory =
      filterCategory === 'all' || product.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleActivateProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: 'active' } : p))
    );
    toast.success('Product activated');
  };

  const handleDeactivateProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: 'inactive' } : p))
    );
    toast.success('Product deactivated');
  };

  const handleFlagProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: 'flagged' } : p))
    );
    toast.success('Product flagged for review');
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success('Product deleted');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'flagged':
        return 'error';
      case 'pending_review':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Product Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and manage all platform products
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold text-foreground">
                  {products.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">
                  {products.filter((p) => p.status === 'active').length}
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
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-error">
                  {products.filter((p) => p.status === 'flagged').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-warning">
                  {products.filter((p) => p.stock === 0).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search products..."
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
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground">
                    Product
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Store
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Category
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Price
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Stock
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Sales
                  </th>
                  <th className="text-right p-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium text-foreground">
                        {product.name}
                      </p>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {product.storeName}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {product.category}
                    </td>
                    <td className="p-4 text-foreground">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          product.stock === 0
                            ? 'text-error'
                            : product.stock < 10
                              ? 'text-warning'
                              : 'text-foreground'
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={getStatusBadgeVariant(product.status) as any}
                      >
                        {product.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-foreground">{product.sales}</td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate.toProduct(product.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Product
                          </DropdownMenuItem>

                          {product.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivateProduct(product.id)
                              }
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivateProduct(product.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => handleFlagProduct(product.id)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Flag for Review
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-error"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Product
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
