import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { useUserMutations } from '@/features/users/hooks/useUsersMutations.ts';
import { toast } from 'sonner';
import { TeamMemberList } from '@/features/stores/components/TeamMemberList.tsx';
import { RoleInfoCard } from '@/features/stores/components/RoleInfoCard.tsx';
import { TeamManagementHeader } from '../components/TeamManagementHeader';
import { InviteMemberDialog } from '../components/InviteMemberDialog';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreRole } from '../types/store.types';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'STORE_ADMIN' | 'STORE_MODERATOR' | 'STORE_GUEST';
  isActive: boolean;
  assignedAt: string;
}

const mapUserRoleToMember = (role: StoreRole): TeamMember => ({
  id: role.userId,
  email: role.user.email,
  name: role.user.firstName + ' ' + role.user.lastName,
  role: role.roleName,
  isActive: role.isActive,
  assignedAt: role.assignedAt.toLocaleDateString(),
});

export function TeamManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { storeId } = useParams<{ storeId: string }>();
  const { data: store, isLoading, error, refetch } = useStore(storeId!);
  const { revokeRole } = useUserMutations();

  const teamMembers = store?.roles?.map(mapUserRoleToMember) || [];

  const handleRemoveMember = async (memberId: string) => {
    try {
      await revokeRole.mutateAsync(
        {
          userId: memberId,
          storeId: store?.id as string,
        },
        {
          onSuccess: () => {
            toast.success('Team member removed');
            refetch();
          },
        }
      );
    } catch (error) {
      toast.error(`Failed to remove team member: ${error}`);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'STORE_ADMIN':
        return 'Admin';
      case 'STORE_MODERATOR':
        return 'Moderator';
      case 'STORE_GUEST':
        return 'Guest';
      default:
        return role;
    }
  };

  return (
    <ErrorBoundary title="Team Management Error">
      <div className="space-y-6">
        <TeamManagementHeader onInvite={() => setIsDialogOpen(true)} />
        <RoleInfoCard />
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading team members..."
        >
          <TeamMemberList
            teamMembers={teamMembers}
            handleRemoveMember={handleRemoveMember}
            getRoleLabel={getRoleLabel}
          />
        </QueryLoader>
        <InviteMemberDialog
          storeId={storeId!}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </ErrorBoundary>
  );
}
