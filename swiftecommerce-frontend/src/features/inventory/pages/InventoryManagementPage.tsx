import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { InventoryTable } from '../components/InventoryTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Download,
} from 'lucide-react';
import { mockProducts } from '@/shared/mocks/products.mock';

export function InventoryManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Convert mock products to inventory items
  const inventoryItems = mockProducts.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      productName: product.name,
      sku: variant.sku,
      storeId,
      quantity: variant.inventory.quantity,
      reserved: Math.floor(variant.inventory.quantity * 0.1), // 10% reserved
      available: Math.floor(variant.inventory.quantity * 0.9),
      lastRestocked: product.createdAt,
    }))
  );

  const totalStock = inventoryItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const lowStockItems = inventoryItems.filter(
    (item) => item.available < 10
  ).length;
  const outOfStockItems = inventoryItems.filter(
    (item) => item.available === 0
  ).length;

  const stats = [
    {
      title: 'Total Stock',
      value: totalStock,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+5.2%',
      trend: 'up' as const,
    },
    {
      title: 'Low Stock',
      value: lowStockItems,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Out of Stock',
      value: outOfStockItems,
      icon: TrendingDown,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    {
      title: 'Total Value',
      value: `$${(totalStock * 100).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      change: '+12.3%',
      trend: 'up' as const,
    },
  ];

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'low' && item.available < 10 && item.available > 0) ||
      (filterStatus === 'out' && item.available === 0) ||
      (filterStatus === 'in' && item.available >= 10);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage your product inventory
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      {/* Low Stock Alert */}
      {lowStockItems > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-semibold text-warning">Low Stock Alert</p>
              <p className="text-sm text-muted-foreground">
                {lowStockItems} product variant(s) are running low on stock
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search by product or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <InventoryTable
            items={filteredItems}
            onUpdateQuantity={(id, quantity) => {
              console.log('Update quantity:', id, quantity);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
