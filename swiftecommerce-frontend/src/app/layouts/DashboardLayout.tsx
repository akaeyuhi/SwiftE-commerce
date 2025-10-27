import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { DashboardHeader } from '@/shared/components/layout/DashboardHeader.tsx';

export function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
