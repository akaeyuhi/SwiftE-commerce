import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Plus } from 'lucide-react';

interface StoreProductsHeaderProps {
  storeId: string;
}

export function StoreProductsHeader({ storeId }: StoreProductsHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>
      <Button onClick={() => navigate.toStoreProductCreate(storeId!)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Product
      </Button>
    </div>
  );
}
