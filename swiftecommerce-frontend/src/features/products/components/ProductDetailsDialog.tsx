import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialogs/dialog.tsx';
import { Badge } from '@/shared/components/ui/Badge';
import { Tag } from 'lucide-react';

interface ProductDetailsDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
}: ProductDetailsDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Product details and variants</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {product.categories.map((category: any) => (
                <Badge key={category.id} variant="outline">
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">
              Variants ({product.variants.length})
            </h4>
            <div className="space-y-2">
              {product.variants.map((variant: any) => (
                <div
                  key={variant.id}
                  className="p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{variant.sku}</span>
                    <span className="font-semibold">
                      ${variant.price.toFixed(2)}
                    </span>
                  </div>

                  {variant.attributes &&
                    Object.keys(variant.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(variant.attributes).map(
                          ([key, value]) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="text-xs"
                            >
                              {key}: {String(value)}
                            </Badge>
                          )
                        )}
                      </div>
                    )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stock</span>
                    <span
                      className={`font-semibold ${
                        variant.inventory.quantity === 0
                          ? 'text-error'
                          : variant.inventory.quantity < 10
                            ? 'text-warning'
                            : 'text-success'
                      }`}
                    >
                      {variant.inventory.quantity} units
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Average Rating</span>
                <p className="font-semibold">
                  {product.averageRating ? `${product.averageRating}/5` : 'N/A'}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Reviews</span>
                <p className="font-semibold">{product.reviewCount}</p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total Sales</span>
                <p className="font-semibold">{product.totalSales}</p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Views</span>
                <p className="font-semibold">{product.viewCount}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
