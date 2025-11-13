import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { toast } from 'sonner';

export function NotificationsSettingsTab() {
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    storeNews: false,
    marketingEmails: false,
  });

  const handleSave = () => {
    toast.info('Notification settings are not yet implemented on the backend.');
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between
      p-4 border border-border rounded-lg"
      >
        <div>
          <p className="font-medium text-foreground">Email Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive important updates via email.
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
            Get notified about your order status.
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
            Updates from stores you follow.
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
          <p className="font-medium text-foreground">Marketing Emails</p>
          <p className="text-sm text-muted-foreground">
            Promotions and product recommendations.
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

      <Button onClick={handleSave}>Save Preferences</Button>
    </div>
  );
}
