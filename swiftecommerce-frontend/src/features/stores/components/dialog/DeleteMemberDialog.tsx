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
import { X } from 'lucide-react';
import React from 'react';
import { TeamMember } from '@/features/stores/pages/TeamManagementPage.tsx';

interface DeleteMemberDialogProps {
  member: TeamMember;
  handleRemoveMember: (memberId: string) => void;
}

export const DeleteMemberDialog: React.FC<DeleteMemberDialogProps> = ({
  member,
  handleRemoveMember,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon">
        <X className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove team member?</AlertDialogTitle>
        <AlertDialogDescription>
          {member.name} will lose access to this store. They will be notified
          via email.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => handleRemoveMember(member.id)}
          className="bg-error text-error-foreground hover:bg-error/90"
        >
          Remove
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
