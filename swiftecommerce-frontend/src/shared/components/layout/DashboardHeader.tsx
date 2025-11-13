import { useUI } from '@/app/store';
import { Menu, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function DashboardHeader() {
  const { toggleSidebar } = useUI();

  return (
    <header
      className=" border-b h-16 px-6
    flex items-center justify-between sticky top-0 z-40"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-muted relative p-2 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-sm text-gray-500 text-center">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
