import { useEffect } from 'react';
import { useAuth, useWishlist } from '@/app/store';
import { useLikes } from '@/features/likes/hooks/useLikes';

/**
 * This component is responsible for synchronizing the user's wishlist
 * from the backend with the Zustand store upon login.
 */
export function WishlistSync() {
  const { user, isAuthenticated } = useAuth();
  const { setInitialState } = useWishlist();
  const { data: likes, isSuccess } = useLikes(user?.id || '', {
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (isSuccess && likes) {
      setInitialState(likes);
    }
  }, [isSuccess, likes, setInitialState]);

  // This component renders nothing.
  return null;
}
