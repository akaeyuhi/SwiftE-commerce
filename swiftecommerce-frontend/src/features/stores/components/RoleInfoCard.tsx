import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card.tsx';
import { Crown, Eye, Shield } from 'lucide-react';

export const RoleInfoCard = () => (
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
          <p className="text-sm text-muted-foreground mb-3">Read-only access</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• View products</li>
            <li>• View orders</li>
            <li>• View analytics</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);
