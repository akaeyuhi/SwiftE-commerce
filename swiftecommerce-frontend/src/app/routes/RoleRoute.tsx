import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/app/store';
import { ROUTES } from './routes';
import { ReactNode, useMemo } from 'react';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';
import { AdminRoles } from '@/lib/enums/site-roles.enum.ts';
import { useUserProfile } from '@/features/users/hooks/useUsers.ts';

interface RoleRouteProps {
  allowedSiteRoles?: Array<AdminRoles>;
  allowedStoreRoles?: Array<StoreRoles>;
  requireStoreAccess?: boolean;
  children?: ReactNode;
}

export function RoleRoute({
  allowedSiteRoles,
  allowedStoreRoles,
  requireStoreAccess = false,
  children,
}: RoleRouteProps) {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const storeId = params.storeId;

  const { data: user, isLoading, error } = useUserProfile();

  if (isLoading || error) return;

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }


  // Check site-level role
  if (allowedSiteRoles && !allowedSiteRoles.includes(user.siteRole)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  // Check store-level role if required
  if (requireStoreAccess && storeId && user.roles) {
    const storeRole = user.roles.find(
      (role) => role.storeId === storeId && role.isActive
    );

    // User must have a role in this store
    if (!storeRole) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }

    // Check if user has one of the allowed store roles
    if (allowedStoreRoles && !allowedStoreRoles.includes(storeRole.roleName)) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }
  }

  // Check if user owns the store (for ownedStores routes)
  if (requireStoreAccess && storeId && user.ownedStores) {
    const ownsStore = user.ownedStores.some((store) => store.id === storeId);
    if (!ownsStore && !user.roles?.some((r) => r.storeId === storeId)) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Helper hook to check store access
 */
export function useStoreAccess(storeId: string) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return { hasAccess: false, role: null, isOwner: false };

    const isOwner = user.ownedStores?.some((store) => store.id === storeId);

    const storeRole = user.roles?.find(
      (role) => role.storeId === storeId && role.isActive
    );

    return {
      hasAccess: isOwner || !!storeRole,
      role: storeRole?.roleName || null,
      isOwner: isOwner || false,
      isAdmin: storeRole?.roleName === StoreRoles.ADMIN || isOwner,
      isModerator:
        storeRole?.roleName === StoreRoles.MODERATOR ||
        storeRole?.roleName === StoreRoles.ADMIN ||
        isOwner,
    };
  }, [user, storeId]);
}
