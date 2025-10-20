import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/store';
import { ROUTES } from '../routes/routes';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <Outlet />
      </div>
    </div>
  );
}
