import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { Badge } from '@/shared/components/ui/Badge';
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
} from '@/components/ui/dialog.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
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
} from '@/shared/components/ui/alert-dialog';
import {
  assignRoleSchema,
  AssignRoleFormData,
} from '@/lib/validations/store.schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Crown, Shield, Eye, X } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'STORE_ADMIN' | 'STORE_MODERATOR' | 'STORE_GUEST';
  isActive: boolean;
  assignedAt: string;
}

export function TeamManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock team data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
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
  ]);

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
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await storeService.assignRole(data)

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Assigning role:', data);

      // Mock adding team member
      const newMember: TeamMember = {
        id: String(teamMembers.length + 1),
        email: data.email,
        name: data.firstName + data.lastName,
        role: data.role,
        isActive: true,
        assignedAt: new Date().toISOString(),
      };

      setTeamMembers([...teamMembers, newMember]);

      toast.success('Team member invited successfully!');
      setIsDialogOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite team member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      // TODO: Replace with actual API call
      // await storeService.removeTeamMember(memberId)

      await new Promise((resolve) => setTimeout(resolve, 500));

      setTeamMembers(teamMembers.filter((m) => m.id !== memberId));
      toast.success('Team member removed');
    } catch (error: any) {
      toast.error('Failed to remove team member');
    }
  };

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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isLoading}>
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding team member roles and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground">Admin</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Full control over the store
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Manage all settings</li>
                <li>• Invite/remove team members</li>
                <li>• Full product & order management</li>
              </ul>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-secondary/50 rounded flex items-center justify-center">
                  <Shield className="h-4 w-4 text-secondary-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">Moderator</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Manage products and orders
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Add/edit products</li>
                <li>• Process orders</li>
                <li>• View analytics</li>
              </ul>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">Guest</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Read-only access
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• View products</li>
                <li>• View orders</li>
                <li>• View analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({teamMembers.length})</CardTitle>
          <CardDescription>
            Manage your store's team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      {member.name.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    <span className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </span>
                  </Badge>

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
                          {member.name} will lose access to this store. They
                          will be notified via email.
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
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
