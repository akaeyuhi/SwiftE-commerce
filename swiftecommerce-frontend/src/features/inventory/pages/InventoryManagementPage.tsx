import { useState, useMemo } from 'react';
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
import { useInventory, InventoryItem } from '../hooks/useInventory';
import { useVariantMutations } from '@/features/products/hooks/useVariants';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { toast } from 'sonner';

import { UpdateQuantityDialog } from '../components/UpdateQuantityDialog';

export function InventoryManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingItem, setUpdatingItem] = useState<InventoryItem | null>(null);

  const { inventoryItems, isLoading, error, isFetching } = useInventory(
    storeId!
  );
  const { setInventory } = useVariantMutations(
    storeId!,
    updatingItem?.id ?? ''
  );

  const totalStock = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
    [inventoryItems]
  );
  const totalValue = useMemo(
    () =>
      inventoryItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [inventoryItems]
  );
  const lowStockItems = useMemo(
    () =>
      inventoryItems.filter((item) => item.quantity > 0 && item.quantity < 10)
        .length,
    [inventoryItems]
  );
  const outOfStockItems = useMemo(
    () => inventoryItems.filter((item) => item.quantity === 0).length,
    [inventoryItems]
  );

  const stats = [
    {
      title: 'Total Stock',
      value: totalStock,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
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
      value: `$${totalValue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const filteredItems = useMemo(
    () =>
      inventoryItems.filter((item) => {
        const matchesSearch =
          item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'low' && item.quantity > 0 && item.quantity < 10) ||
          (filterStatus === 'out' && item.quantity === 0) ||
          (filterStatus === 'in' && item.quantity >= 10);

        return matchesSearch && matchesStatus;
      }),
    [inventoryItems, searchQuery, filterStatus]
  );

  const handleUpdateQuantity = (item: InventoryItem) => {
    setUpdatingItem(item);
  };

  const handleConfirmUpdate = (quantity: number) => {
    if (!updatingItem) return;

    setInventory.mutate(
      {
        id: updatingItem.variantId,
        data: { quantity },
      },
      {
        onSuccess: () => {
          updatingItem.quantity = quantity;
          setUpdatingItem(null);
        },
        onError: () => {
          toast.error('Failed to update inventory');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
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

      <StatsGrid stats={stats} columns={4} />

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

      <Card>
        <CardContent className="p-0">
          <QueryLoader
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
          >
            <InventoryTable
              items={filteredItems}
              onUpdateQuantity={handleUpdateQuantity}
            />
          </QueryLoader>
        </CardContent>
      </Card>

      <UpdateQuantityDialog
        open={!!updatingItem}
        onOpenChange={() => setUpdatingItem(null)}
        item={updatingItem}
        onConfirm={handleConfirmUpdate}
      />
    </div>
  );
}
