import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { Crown, Eye, Shield } from 'lucide-react';
import { useUserMutations } from '@/features/users/hooks/useUsersMutations.ts';
import { api } from '@/lib/api';

interface InviteMemberDialogProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  storeId,
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberDialogProps) {
  const { assignRole } = useUserMutations();

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

      await assignRole.mutateAsync(
        {
          userId: checkUser.id,
          roleData: {
            storeId,
            roleName: data.role,
          },
        },
        {
          onSuccess: () => {
            toast.success('Team member invited successfully!');
            onSuccess();
            reset();
          },
        }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite team member');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onClick={() => onOpenChange(false)}
              disabled={assignRole.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={assignRole.isPending}>
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
