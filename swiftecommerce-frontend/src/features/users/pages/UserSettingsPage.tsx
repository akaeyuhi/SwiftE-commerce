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
import { Badge } from '@/shared/components/ui/Badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/Tabs';
import { useAuth } from '@/app/store';
import {
  User as UserIcon,
  Lock,
  Bell,
  Download,
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export function UserSettingsPage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    storeNews: false,
    marketingEmails: false,
  });

  const handleDownloadData = async () => {
    try {
      // Mock data download - in production, this would fetch from API
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

  const handleDownloadAvatar = async () => {
    try {
      if (!user?.avatar) {
        toast.error('No avatar to download');
        return;
      }

      const response = await fetch(user.avatar);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', `avatar-${user.id}.jpg`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(url);

      toast.success('Avatar downloaded');
    } catch (error) {
      toast.error(`Failed to download avatar: ${error}`);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) {
      toast.success('Account deletion initiated');
      logout();
    } else {
      setIsDeletingAccount(true);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Account Settings
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your account preferences and security
        </p>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-start gap-6">
                  <div
                    className="h-24 w-24 bg-muted rounded-lg
                  flex items-center justify-center flex-shrink-0"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <UserIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Upload Avatar
                      </Button>
                      {user?.avatar && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadAvatar}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <form className="space-y-4">
                    <FormField label="First Name">
                      <Input defaultValue={user?.firstName} />
                    </FormField>
                    <FormField label="Last Name">
                      <Input defaultValue={user?.lastName} />
                    </FormField>
                    <FormField label="Email">
                      <Input type="email" defaultValue={user?.email} disabled />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed here. Use email update section.
                      </p>
                    </FormField>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.success('Profile updated');
                          setIsEditing(false);
                        }}
                      >
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Full Name
                      </p>
                      <p className="text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p className="text-foreground flex items-center gap-2">
                        {user?.email}
                        <Badge variant="success" className="text-xs">
                          Verified
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Member Since
                      </p>
                      <p className="text-foreground">
                        {new Date(user?.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Password
                  </h3>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold text-foreground mb-3">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <Badge variant="warning" className="mb-4">
                    Not Enabled
                  </Badge>
                  <br />
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold text-foreground mb-3">
                    Active Sessions
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your active sessions and sign out from other devices
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg mb-3">
                    <p className="text-sm font-medium text-foreground">
                      Current Device
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active: just now
                    </p>
                  </div>
                  <Button variant="outline">Sign Out Other Sessions</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex items-center justify-between
                p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Email Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotifications: e.target.checked,
                      })
                    }
                    className="h-5 w-5 cursor-pointer"
                  />
                </div>

                <div
                  className="flex items-center justify-between
                p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">Order Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about your order status
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderUpdates}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        orderUpdates: e.target.checked,
                      })
                    }
                    className="h-5 w-5 cursor-pointer"
                  />
                </div>

                <div
                  className="flex items-center justify-between
                p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">Store News</p>
                    <p className="text-sm text-muted-foreground">
                      Updates from stores you follow
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.storeNews}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        storeNews: e.target.checked,
                      })
                    }
                    className="h-5 w-5 cursor-pointer"
                  />
                </div>

                <div
                  className="flex items-center justify-between
                p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Marketing Emails
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Promotions and product recommendations
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.marketingEmails}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        marketingEmails: e.target.checked,
                      })
                    }
                    className="h-5 w-5 cursor-pointer"
                  />
                </div>

                <Button
                  onClick={() => {
                    toast.success('Notification preferences saved');
                  }}
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Download Your Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download all your personal data in JSON format
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
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                  <Button variant="error" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeletingAccount ? 'Confirm Deletion' : 'Delete Account'}
                  </Button>
                  {isDeletingAccount && (
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => setIsDeletingAccount(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
