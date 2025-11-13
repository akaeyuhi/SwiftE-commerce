import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Edit, Package, Tag, Trash2 } from 'lucide-react';
import { CategoryDto } from '@/features/categories/types/categories.types.ts';

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  inventory: { quantity: number };
  attributes?: Record<string, any>;
}

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  categories?: CategoryDto[];
  variants: ProductVariant[];
  mainPhotoUrl?: string | null;
  totalSales: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function ProductCard({
  id,
  name,
  description,
  categories,
  variants,
  mainPhotoUrl,
  totalSales,
  onEdit,
  onDelete,
  onView,
}: ProductCardProps) {
  const totalStock = variants.reduce((sum, v) => sum + v.inventory.quantity, 0);
  const lowestPrice = Math.min(...variants.map((v) => v.price));
  const highestPrice = Math.max(...variants.map((v) => v.price));
  const priceRange =
    lowestPrice === highestPrice
      ? `$${lowestPrice.toFixed(2)}`
      : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`;

  const stockStatus =
    totalStock === 0
      ? { label: 'Out of Stock', variant: 'error' as const }
      : totalStock < 10
        ? { label: 'Low Stock', variant: 'warning' as const }
        : { label: 'In Stock', variant: 'success' as const };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Image */}
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {mainPhotoUrl ? (
            <img
              src={mainPhotoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground" />
          )}
          <div className="absolute top-2 right-2">
            <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
          </div>
        </div>

        <div className="p-6">
          {/* Title & Categories */}
          <div className="mb-3">
            <h3 className="font-semibold text-foreground mb-1">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {description}
            </p>
            <div className="flex flex-wrap gap-1">
              {categories?.map((category) => (
                <Badge key={category.id} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price Range</span>
              <span className="font-semibold text-foreground">
                {priceRange}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Variants</span>
              <span className="font-semibold text-foreground">
                {variants.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Stock</span>
              <span className="font-semibold text-foreground">
                {totalStock}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sales</span>
              <span className="font-semibold text-foreground">
                {totalSales}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView(id)}
            >
              View
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
