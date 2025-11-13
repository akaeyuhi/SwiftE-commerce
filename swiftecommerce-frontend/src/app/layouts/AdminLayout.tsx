import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/shared/components/layout/AdminSidebar.tsx';
import { AdminHeader } from '@/shared/components/layout/AdminHeader.tsx';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
