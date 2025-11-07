import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/Tabs';
import { User as UserIcon, Lock, Bell, Download } from 'lucide-react';
import { ProfileSettingsTab } from '../components/settings/ProfileSettingsTab';
import { SecuritySettingsTab } from '../components/settings/SecuritySettingsTab';
import { NotificationsSettingsTab } from '../components/settings/NotificationsSettingsTab';
import { DataSettingsTab } from '../components/settings/DataSettingsTab';

export function UserSettingsPage() {
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

          <TabsContent value="profile">
            <ProfileSettingsTab />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsTab />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSettingsTab />
          </TabsContent>

          <TabsContent value="data">
            <DataSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
