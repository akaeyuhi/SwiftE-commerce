import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/store';
import { ROUTES } from './routes';

interface RoleRouteProps {
  allowedRoles: Array<"SITE_USER" | "SITE_ADMIN" | "STORE_MODERATOR" | "STORE_ADMIN" >;
  children?: React.ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user && !allowedRoles.includes(user.siteRole)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
