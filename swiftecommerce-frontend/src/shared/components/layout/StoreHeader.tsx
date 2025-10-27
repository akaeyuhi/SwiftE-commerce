import { useAuth, useUI } from '@/app/store';
import { useParams } from 'react-router-dom';
import { Menu, Store, Eye } from 'lucide-react';
import { Link } from '@/shared/components/ui/Link';
import { NotificationsDropdown } from '@/shared/components/header/NotificationsDropdown';

export function StoreHeader() {
  const { user } = useAuth();
  const { toggleSidebar } = useUI();
  const { storeId } = useParams<{ storeId: string }>();

  const store = user?.ownedStores?.find((owned) => owned.id === storeId);

  // Get store name from user's owned stores
  const storeName = store?.name || 'My Store';

  return (
    <header
      className="bg-background border-b border-border h-16
    px-6 flex items-center justify-between sticky top-0 z-40"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => toggleSidebar()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Store Management
            </h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* View Store - Public Link */}
        {storeId && (
          <Link
            to={`/stores/${storeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 px-3 py-2
            text-sm hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View Public Store</span>
          </Link>
        )}

        {/* Notifications */}
        <NotificationsDropdown />
      </div>
    </header>
  );
}
