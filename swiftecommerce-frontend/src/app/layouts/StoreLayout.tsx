import { Outlet } from 'react-router-dom';
import { StoreSidebar } from '@/shared/components/layout/StoreSidebar';
import { StoreHeader } from '@/shared/components/layout/StoreHeader';

export function StoreLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader />
      <div className="flex">
        <StoreSidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
