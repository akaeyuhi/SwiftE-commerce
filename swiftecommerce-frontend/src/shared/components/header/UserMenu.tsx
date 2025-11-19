import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  User,
  Store,
  ShoppingCart,
  Heart,
  Settings,
  LogOut,
  LucideLayoutDashboard,
} from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate.toHome();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2
            hover:bg-muted rounded-lg transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.firstName[0]}
              className="h-8 w-8 bg-primary text-primary-foreground rounded-full
              flex items-center justify-center font-semibold"
            />
          ) : (
            <>
              <div
                className="h-8 w-8 bg-primary text-primary-foreground rounded-full
              flex items-center justify-center font-semibold"
              >
                {user?.firstName?.toUpperCase()[0] || 'U'}
              </div>
              <span className="font-medium text-foreground">
                {user?.firstName}
              </span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate.to(`/users/${user?.id}`)}>
          <User className="h-4 w-4 mr-2" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate.toDashboard()}>
          <LucideLayoutDashboard className="h-4 w-4 mr-2" />
          Dashboard
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate.toOrders()}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          My Orders
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate.to('/wishlist')}>
          <Heart className="h-4 w-4 mr-2" />
          Wishlist
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate.toMyStores()}>
          <Store className="h-4 w-4 mr-2" />
          My Stores
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate.to(`/settings`)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-error focus:text-error"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
