import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/store';
import { ROUTES } from './routes';

interface RoleRouteProps {
  allowedRoles: Array<'customer' | 'store_owner' | 'admin'>;
  children?: React.ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
