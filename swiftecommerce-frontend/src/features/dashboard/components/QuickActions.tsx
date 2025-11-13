import { Card, CardContent } from '@/shared/components/ui/Card';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ShoppingCart, Store, Package } from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Browse Products',
      description: 'Discover new items',
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      action: () => navigate.toProducts(),
    },
    {
      title: 'My Stores',
      description: 'Manage your stores',
      icon: Store,
      color: 'text-info',
      bgColor: 'bg-info/10',
      action: () => navigate.toMyStores(),
    },
    {
      title: 'My Orders',
      description: 'Track your purchases',
      icon: ShoppingCart,
      color: 'text-success',
      bgColor: 'bg-success/10',
      action: () => navigate.toOrders(),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {actions.map((action) => (
        <Card
          key={action.title}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={action.action}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 ${action.bgColor} rounded-lg
                flex items-center justify-center`}
              >
                <action.icon className={`h-6 w-6 ${action.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
