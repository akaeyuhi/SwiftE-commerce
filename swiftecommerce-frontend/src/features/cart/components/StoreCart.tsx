import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowRight, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CartItemCard } from './CartItemCard';
import { CartItem } from '@/features/cart/types/cart.types.ts';

interface StoreCartProps {
  store: {
    id: string;
    name: string;
    items: CartItem[];
  };
  onClear: (storeId: string) => void;
  onRemoveItem: (item: CartItem) => void;
  onUpdateQuantity: (item: CartItem, quantity: number) => void;
}

export function StoreCart({
  store,
  onClear,
  onRemoveItem,
  onUpdateQuantity,
}: StoreCartProps) {
  const navigate = useNavigate();

  const storeTotal = store.items.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>{store.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClear(store.id)}
            aria-label={`Clear all items from ${store.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {store.items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onRemove={onRemoveItem}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}

        <div
          className="flex items-center justify-between
                      pt-4 border-t border-border"
        >
          <span className="font-semibold text-foreground">Store Subtotal:</span>
          <span className="text-xl font-bold text-foreground">
            ${storeTotal.toFixed(2)}
          </span>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            navigate.toCheckout();
            toast.info('Checkout for individual stores coming soon!');
          }}
        >
          Checkout from {store.name}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
