import { Button } from '@/shared/components/ui/Button';
import { UserPlus } from 'lucide-react';

interface TeamManagementHeaderProps {
  onInvite: () => void;
}

export function TeamManagementHeader({ onInvite }: TeamManagementHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Team Management
        </h1>
        <p className="text-muted-foreground">
          Invite and manage your store team members
        </p>
      </div>
      <Button onClick={onInvite}>
        <UserPlus className="h-4 w-4 mr-2" />
        Invite Member
      </Button>
    </div>
  );
}
