import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/dialogs/alert-dialog.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';

interface DeleteStoreDialogProps {
  isDeleting: boolean;
  handleDeleteStore: () => void;
}

export const DeleteStoreDialog: React.FC<DeleteStoreDialogProps> = ({
  isDeleting,
  handleDeleteStore,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="error" disabled={isDeleting}>
        Delete Store
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your store
          and remove all associated data including products, orders, and team
          members.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDeleteStore}
          className="bg-error text-error-foreground hover:bg-error/90"
        >
          {isDeleting ? 'Deleting...' : 'Yes, delete store'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
