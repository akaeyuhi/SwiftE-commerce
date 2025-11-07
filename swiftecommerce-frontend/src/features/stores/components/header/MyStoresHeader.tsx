import { Button } from '@/shared/components/ui/Button';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Plus } from 'lucide-react';

export function MyStoresHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">My Stores</h1>
        <p className="text-muted-foreground">
          Manage your stores and team access
        </p>
      </div>
      <Button onClick={() => navigate.toCreateStore()}>
        <Plus className="h-4 w-4 mr-2" />
        Create Store
      </Button>
    </div>
  );
}
