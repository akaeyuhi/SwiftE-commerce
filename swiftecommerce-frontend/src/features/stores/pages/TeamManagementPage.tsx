import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/dialogs/dialog.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  assignRoleSchema,
  AssignRoleFormData,
} from '@/lib/validations/store.schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Crown, Shield, Eye } from 'lucide-react';
import { TeamMemberList } from '@/features/stores/components/TeamMemberList.tsx';
import { RoleInfoCard } from '@/features/stores/components/RoleInfoCard.tsx';
import { useParams } from 'react-router-dom';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { StoreRole } from '@/features/stores/types/store.types.ts';
import { useUserMutations } from '@/features/users/hooks/useUsersMutations.ts';
import { api } from '@/lib/api';

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

  const { assignRole, revokeRole } = useUserMutations();

  const { data: store } = useStore(storeId!);

  const members = store?.roles?.map(mapUserRoleToMember);

  // Mock team data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    members ?? [
      {
        id: '1',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'STORE_ADMIN',
        isActive: true,
        assignedAt: '2024-01-15',
      },
      {
        id: '2',
        email: 'jane@example.com',
        name: 'Jane Smith',
        role: 'STORE_MODERATOR',
        isActive: true,
        assignedAt: '2024-02-20',
      },
    ]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AssignRoleFormData>({
    resolver: zodResolver(assignRoleSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: AssignRoleFormData) => {
    try {
      const checkUser = await api.users.getUserByEmail(data.email);
      if (!checkUser) {
        toast.error(`User with email ${data.email} doesn't exist!`);
        return;
      }

      const newMember: TeamMember = {
        id: checkUser.id,
        email: data.email,
        name: checkUser.firstName + checkUser.lastName,
        role: data.role,
        isActive: true,
        assignedAt: new Date().toISOString(),
      };

      await assignRole.mutateAsync(
        {
          userId: newMember.id,
          roleData: {
            storeId: store?.id as string,
            roleName: data.role,
          },
        },
        {
          onSuccess: () => {
            console.log('Assigning role:', data);
            toast.success('Team member invited successfully!');
            setTeamMembers([...teamMembers, newMember]);
            setIsDialogOpen(false);
            reset();
          },
        }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite team member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setTeamMembers(teamMembers.filter((m) => m.id !== memberId));
      await revokeRole.mutateAsync(
        {
          userId: memberId,
          storeId: store?.id as string,
        },
        {
          onSuccess: () => {
            toast.success('Team member removed');
            setIsDialogOpen(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Invite and manage your store team members
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your store team
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Email Address" error={errors.email} required>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="team@example.com"
                  error={!!errors.email}
                />
              </FormField>

              <FormField label="Role" error={errors.role} required>
                <Select onValueChange={(value: any) => setValue('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORE_ADMIN">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="STORE_MODERATOR">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Moderator - Can manage products & orders
                      </div>
                    </SelectItem>
                    <SelectItem value="STORE_GUEST">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Guest - View only access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {selectedRole && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-foreground mb-1">
                    Permissions for {getRoleLabel(selectedRole)}:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {selectedRole === 'STORE_ADMIN' && (
                      <>
                        <li>✓ Full store management</li>
                        <li>✓ Manage team members</li>
                        <li>✓ View analytics</li>
                        <li>✓ Manage all products & orders</li>
                      </>
                    )}
                    {selectedRole === 'STORE_MODERATOR' && (
                      <>
                        <li>✓ Manage products</li>
                        <li>✓ Process orders</li>
                        <li>✓ View analytics</li>
                        <li>✗ Cannot manage team</li>
                      </>
                    )}
                    {selectedRole === 'STORE_GUEST' && (
                      <>
                        <li>✓ View products</li>
                        <li>✓ View orders</li>
                        <li>✗ Cannot edit anything</li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={assignRole.isPending || revokeRole.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={assignRole.isPending || revokeRole.isPending}
                >
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <RoleInfoCard />

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({teamMembers.length})</CardTitle>
          <CardDescription>
            Manage your store&#39;s team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMemberList
            teamMembers={teamMembers}
            handleRemoveMember={handleRemoveMember}
            getRoleLabel={getRoleLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
