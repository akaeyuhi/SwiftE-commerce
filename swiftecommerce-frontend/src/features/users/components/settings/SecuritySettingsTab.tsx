import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export function SecuritySettingsTab() {
  const handleChangePassword = () => {
    toast.info('Password change functionality is not yet implemented.');
  };

  const handleEnable2FA = () => {
    toast.info('Two-factor authentication is not yet implemented.');
  };

  const handleSignOutOther = () => {
    toast.info('Signing out from other sessions is not yet implemented.');
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-foreground mb-3">Password</h3>
        <Button variant="outline" onClick={handleChangePassword}>
          <Lock className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-foreground mb-3">
          Two-Factor Authentication
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add an extra layer of security to your account.
        </p>
        <Badge variant="warning" className="mb-4">
          Not Enabled
        </Badge>
        <br />
        <Button variant="outline" onClick={handleEnable2FA}>
          Enable 2FA
        </Button>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-foreground mb-3">Active Sessions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your active sessions and sign out from other devices.
        </p>
        <div className="bg-muted/50 p-3 rounded-lg mb-3">
          <p className="text-sm font-medium text-foreground">Current Device</p>
          <p className="text-xs text-muted-foreground">Last active: just now</p>
        </div>
        <Button variant="outline" onClick={handleSignOutOther}>
          Sign Out Other Sessions
        </Button>
      </div>
    </div>
  );
}
