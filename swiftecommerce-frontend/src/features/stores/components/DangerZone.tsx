import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { AlertTriangle } from 'lucide-react';
import { DeleteStoreDialog } from '@/features/stores/components/DeleteStoreDialog.tsx';
import { useStoreMutations } from '@/features/stores/hooks/useStoreMutations.ts';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';

interface DangerZoneProps {
  storeId: string;
}

export function DangerZone({ storeId }: DangerZoneProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteStore } = useStoreMutations();
  const navigate = useNavigate();

  const handleDeleteStore = async () => {
    setIsDeleting(true);
    await deleteStore.mutateAsync(storeId, {
      onSuccess: () => {
        toast.success('Store deleted successfully');
        setIsDeleting(false);
        navigate.toMyStores();
      },
      onError: () => setIsDeleting(false),
    });
  };

  return (
    <Card className="border-error">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-error" />
          <div>
            <CardTitle className="text-error">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your store
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className="flex items-center justify-between
            p-4 bg-error/5 border border-error/20 rounded-lg"
          >
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Delete Store
              </h4>
              <p className="text-sm text-muted-foreground">
                Once deleted, all data will be permanently removed
              </p>
            </div>
            <DeleteStoreDialog
              isDeleting={isDeleting}
              handleDeleteStore={handleDeleteStore}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
