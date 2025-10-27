import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Package, Edit } from 'lucide-react';

interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  lastRestocked?: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export function InventoryTable({ items }: InventoryTableProps) {
  const getStockStatus = (available: number) => {
    if (available === 0)
      return { label: 'Out of Stock', variant: 'error' as const };
    if (available < 10)
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
              Total
            </th>
            <th className="text-right p-4 font-semibold text-foreground">
              Reserved
            </th>
            <th className="text-right p-4 font-semibold text-foreground">
              Available
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
            const status = getStockStatus(item.available);
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
                <td className="p-4 text-right text-muted-foreground">
                  {item.reserved}
                </td>
                <td className="p-4 text-right font-semibold text-foreground">
                  {item.available}
                </td>
                <td className="p-4">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {item.lastRestocked
                    ? new Date(item.lastRestocked).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="p-4 text-right">
                  <Button variant="outline" size="sm">
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
