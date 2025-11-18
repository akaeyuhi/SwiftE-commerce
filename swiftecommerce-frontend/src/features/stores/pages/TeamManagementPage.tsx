import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStoreTeam } from '@/features/stores/hooks/useStores.ts';
import { useUserMutations } from '@/features/users/hooks/useUsersMutations.ts';
import { toast } from 'sonner';
import { TeamMemberList } from '@/features/stores/components/grid-list/TeamMemberList.tsx';
import { RoleInfoCard } from '@/features/stores/components/card/RoleInfoCard.tsx';
import { TeamManagementHeader } from '../components/header/TeamManagementHeader';
import { InviteMemberDialog } from '../components/dialog/InviteMemberDialog';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreRole } from '../types/store.types';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';
import { useAuth } from '@/app/store';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: StoreRoles;
  isActive: boolean;
  assignedAt: string;
}

const mapUserRoleToMember = (role: StoreRole): TeamMember => ({
  id: role.userId,
  email: role.user.email,
  name: role.user.firstName + ' ' + role.user.lastName,
  role: role.roleName,
  isActive: role.isActive,
  assignedAt:
    /*role.assignedAt?.toLocaleDateString() ??*/ new Date().toLocaleDateString(),
});

export function TeamManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { storeId } = useParams<{ storeId: string }>();
  const { user } = useAuth();
  const { data: store, isLoading, error, refetch } = useStoreTeam(storeId!);
  const { revokeStoreRole } = useUserMutations();

  const teamMembers =
    store?.storeRoles
      ?.map(mapUserRoleToMember)
      .filter((member) => member.isActive) || [];

  const handleRemoveMember = async (memberId: string) => {
    try {
      if (memberId === user?.id)
        return toast.error(`You can't remove yourself`);
      await revokeStoreRole.mutateAsync(
        {
          userId: memberId,
          storeId: store?.id as string,
        },
        {
          onSuccess: () => {
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
      case StoreRoles.ADMIN:
        return 'Admin';
      case StoreRoles.MODERATOR:
        return 'Moderator';
      case StoreRoles.GUEST:
        return 'Guest';
      default:
        return role;
    }
  };

  console.log(store);

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
          onSuccess={() => {
            setIsDialogOpen(false);
            refetch();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
