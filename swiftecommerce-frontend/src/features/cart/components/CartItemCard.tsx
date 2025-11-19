import { Badge } from '@/shared/components/ui/Badge';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { CartItem } from '@/features/cart/types/cart.types.ts';

interface CartItemCardProps {
  item: CartItem;
  onRemove: (item: CartItem) => void;
  onUpdateQuantity: (item: CartItem, quantity: number) => void;
}

export function CartItemCard({
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemCardProps) {
  return (
    <div
      key={item.id}
      className="flex gap-4 p-4 border border-border rounded-lg"
    >
      {item.variant.product.mainPhotoUrl ? (
        <img
          src={item.variant.product.mainPhotoUrl}
          alt={item.variant.product.name}
          className="h-24 w-24 bg-muted rounded-lg
                        flex items-center justify-center flex-shrink-0"
        />
      ) : (
        <div
          className="h-24 w-24 bg-muted rounded-lg
                        flex items-center justify-center flex-shrink-0"
        >
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-foreground">
              {item.variant.product.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              SKU: {item.variant.sku}
            </p>
          </div>
          <button
            onClick={() => onRemove(item)}
            className="text-muted-foreground hover:text-error p-2"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {item.variant.attributes &&
          Object.keys(item.variant.attributes).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(item.variant.attributes).map(([key, value]) => (
                <Badge key={key} variant="secondary">
                  {key}: {value as string}
                </Badge>
              ))}
            </div>
          )}

        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">
            ${(item.variant.price * item.quantity).toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ${item.variant.price.toFixed(2)} each
            </span>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateQuantity(item, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="h-8 w-8 rounded border border-border flex items-center
                                justify-center hover:bg-muted disabled:opacity-50
                                disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold w-12 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item, item.quantity + 1)}
              className="h-8 w-8 rounded border border-border flex items-center
                                justify-center hover:bg-muted disabled:opacity-50
                                disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
