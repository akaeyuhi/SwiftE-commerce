import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/store';
import { useUserMutations } from '../../hooks/useUsersMutations';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';

export function DataSettingsTab() {
  const { user, logout } = useAuth();
  const { deactivateUser } = useUserMutations();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const handleDownloadData = () => {
    try {
      const userData = {
        profile: user,
        downloadedAt: new Date().toISOString(),
      };

      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(userData, null, 2))
      );
      element.setAttribute('download', `user-data-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success('Your data has been downloaded');
    } catch (error) {
      toast.error(`Failed to download data: ${error}`);
    }
  };

  const handleDeleteAccount = () => {
    deactivateUser.mutate(user!.id, {
      onSuccess: () => {
        toast.success('Account deactivated successfully.');
        logout();
      },
    });
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Download Your Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download all your personal data in JSON format.
            </p>
            <Button onClick={handleDownloadData}>
              <Download className="h-4 w-4 mr-2" />
              Download Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-error/30">
          <CardHeader>
            <CardTitle className="text-error">Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently deactivate your account and all associated data. This
              action can be undone by an administrator.
            </p>
            <Button variant="error" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Deactivate Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setConfirmOpen}
        title="Are you sure?"
        description="This will deactivate your account. You can contact support to reactivate it."
        onConfirm={handleDeleteAccount}
        variant="danger"
        confirmText="Deactivate"
        loading={deactivateUser.isPending}
      />
    </>
  );
}
