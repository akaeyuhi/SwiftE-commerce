import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialogs/dialog';
import { FormField } from '@/shared/components/forms/FormField';
import { InventoryItem } from '../hooks/useInventory';

interface UpdateQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onConfirm: (quantity: number) => void;
  loading?: boolean;
}

export function UpdateQuantityDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
  loading,
}: UpdateQuantityDialogProps) {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
    }
  }, [item]);

  const handleConfirm = () => {
    onConfirm(quantity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Quantity</DialogTitle>
          <DialogDescription>
            Set a new stock quantity for{' '}
            <span className="font-semibold">{item?.productName}</span> (
            {item?.sku}).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <FormField label="New Quantity">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={0}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
