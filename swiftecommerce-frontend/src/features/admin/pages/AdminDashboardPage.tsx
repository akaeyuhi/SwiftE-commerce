import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Users,
  Store,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Activity,
} from 'lucide-react';

export function AdminDashboardPage() {
  const stats = [
    {
      title: 'Total Users',
      value: '12,543',
      change: '+12.5%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Stores',
      value: '1,234',
      change: '+8.2%',
      trend: 'up' as const,
      icon: Store,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Orders',
      value: '45,678',
      change: '+15.3%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Revenue',
      value: '$2.4M',
      change: '+20.1%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'user',
      message: 'New user registered: john.doe@example.com',
      time: '5 minutes ago',
      status: 'info',
    },
    {
      id: '2',
      type: 'store',
      message: 'Store "Tech Haven" submitted for approval',
      time: '15 minutes ago',
      status: 'warning',
    },
    {
      id: '3',
      type: 'order',
      message: 'High-value order placed: $5,432.00',
      time: '1 hour ago',
      status: 'success',
    },
    {
      id: '4',
      type: 'report',
      message: 'User reported suspicious activity',
      time: '2 hours ago',
      status: 'error',
    },
  ];

  const pendingActions = [
    {
      id: '1',
      title: 'Store Approvals',
      count: 5,
      priority: 'high',
    },
    {
      id: '2',
      title: 'Product Reports',
      count: 12,
      priority: 'medium',
    },
    {
      id: '3',
      title: 'User Verification',
      count: 8,
      priority: 'low',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Activity className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-error" />;
      default:
        return <Activity className="h-4 w-4 text-info" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3
                  rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getStatusIcon(activity.status)}
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 border border-border
                  rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {action.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {action.count} items require attention
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(action.priority) as any}>
                    {action.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
