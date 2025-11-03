import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { Save, Globe, Shield, CreditCard, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@radix-ui/react-switch';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'SwiftE-commerce',
    siteUrl: 'https://swiftecommerce.com',
    supportEmail: 'support@swiftecommerce.com',
    allowRegistration: true,
    requireEmailVerification: true,
    requireStoreApproval: true,
    allowGuestCheckout: false,
    maintenanceMode: false,
    notifyNewUsers: true,
    notifyNewStores: true,
    notifyNewOrders: false,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Platform Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global platform settings
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Site Name">
            <Input
              value={settings.siteName}
              onChange={(e) =>
                setSettings({ ...settings, siteName: e.target.value })
              }
            />
          </FormField>
          <FormField label="Site URL">
            <Input
              value={settings.siteUrl}
              onChange={(e) =>
                setSettings({ ...settings, siteUrl: e.target.value })
              }
            />
          </FormField>
          <FormField label="Support Email">
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) =>
                setSettings({ ...settings, supportEmail: e.target.value })
              }
            />
          </FormField>
        </CardContent>
      </Card>

      {/* User Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Allow Registration</p>
              <p className="text-sm text-muted-foreground">
                Enable new users to register
              </p>
            </div>
            <Switch
              checked={settings.allowRegistration}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, allowRegistration: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Require Email Verification
              </p>
              <p className="text-sm text-muted-foreground">
                Users must verify email before accessing features
              </p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, requireEmailVerification: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Allow Guest Checkout
              </p>
              <p className="text-sm text-muted-foreground">
                Allow purchases without account
              </p>
            </div>
            <Switch
              checked={settings.allowGuestCheckout}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, allowGuestCheckout: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Store Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Store Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Require Store Approval
              </p>
              <p className="text-sm text-muted-foreground">
                New stores need admin approval before going live
              </p>
            </div>
            <Switch
              checked={settings.requireStoreApproval}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, requireStoreApproval: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Admin Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                New User Registration
              </p>
              <p className="text-sm text-muted-foreground">
                Get notified when new users register
              </p>
            </div>
            <Switch
              checked={settings.notifyNewUsers}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, notifyNewUsers: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                New Store Submissions
              </p>
              <p className="text-sm text-muted-foreground">
                Get notified when stores are submitted for review
              </p>
            </div>
            <Switch
              checked={settings.notifyNewStores}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, notifyNewStores: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">New Orders</p>
              <p className="text-sm text-muted-foreground">
                Get notified for every new order (can be noisy)
              </p>
            </div>
            <Switch
              checked={settings.notifyNewOrders}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, notifyNewOrders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Put the site in maintenance mode (only admins can access)
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked: any) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
