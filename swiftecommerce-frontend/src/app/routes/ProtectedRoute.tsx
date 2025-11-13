import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/store';
import { ROUTES } from './routes';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, save the attempted location
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
