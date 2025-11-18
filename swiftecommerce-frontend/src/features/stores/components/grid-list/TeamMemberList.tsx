import { TeamMember } from '@/features/stores/pages/TeamManagementPage.tsx';
import { Badge } from '@/shared/components/ui/Badge';
import React from 'react';
import { DeleteMemberDialog } from '@/features/stores/components/dialog/DeleteMemberDialog.tsx';
import { Crown, Eye, Shield } from 'lucide-react';

interface TeamMemberListProps {
  teamMembers: TeamMember[];
  handleRemoveMember: (memberId: string) => void;
  getRoleLabel: (role: string) => string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'STORE_ADMIN':
      return <Crown className="h-4 w-4" />;
    case 'STORE_MODERATOR':
      return <Shield className="h-4 w-4" />;
    case 'STORE_GUEST':
      return <Eye className="h-4 w-4" />;
    default:
      return null;
  }
};

const getRoleBadgeVariant = (
  role: string
): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'STORE_ADMIN':
      return 'default';
    case 'STORE_MODERATOR':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const TeamMemberList: React.FC<TeamMemberListProps> = ({
  teamMembers,
  handleRemoveMember,
  getRoleLabel,
}) => (
  <div className="space-y-3">
    {teamMembers.map((member) => (
      <div
        key={member.id}
        className="flex items-center justify-between p-4
                border border-border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="h-10 w-10 bg-primary/10 rounded-full
                  flex items-center justify-center"
          >
            <span className="text-sm font-semibold text-primary">
              {member.name.toUpperCase()[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={getRoleBadgeVariant(member.role)}>
            <span className="flex items-center gap-1">
              {getRoleIcon(member.role)}
              {getRoleLabel(member.role)}
            </span>
          </Badge>
          <DeleteMemberDialog
            member={member}
            handleRemoveMember={handleRemoveMember}
          />
        </div>
      </div>
    ))}
  </div>
);
