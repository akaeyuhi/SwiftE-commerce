import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Package, Edit } from 'lucide-react';
import { InventoryItem } from '../hooks/useInventory';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateQuantity: (item: InventoryItem) => void;
}

export function InventoryTable({
  items,
  onUpdateQuantity,
}: InventoryTableProps) {
  const getStockStatus = (quantity: number) => {
    if (quantity === 0)
      return { label: 'Out of Stock', variant: 'error' as const };
    if (quantity < 10)
      return { label: 'Low Stock', variant: 'warning' as const };
    return { label: 'In Stock', variant: 'success' as const };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-4 font-semibold text-foreground">
              Product
            </th>
            <th className="text-left p-4 font-semibold text-foreground">SKU</th>
            <th className="text-right p-4 font-semibold text-foreground">
              Quantity
            </th>
            <th className="text-left p-4 font-semibold text-foreground">
              Status
            </th>
            <th className="text-left p-4 font-semibold text-foreground">
              Last Restocked
            </th>
            <th className="text-right p-4 font-semibold text-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item.quantity);
            return (
              <tr
                key={item.id}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground">
                      {item.productName}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-mono text-sm text-foreground">
                    {item.sku}
                  </span>
                </td>
                <td className="p-4 text-right font-semibold text-foreground">
                  {item.quantity}
                </td>
                <td className="p-4">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
