import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Heart, Store } from 'lucide-react';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid';
import { LikedProductsTab } from '../components/profile/LikedProductsTab';
import { FollowedStoresTab } from '../components/profile/FollowedStoresTab';
import { useAuth } from '@/app/store';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes/routes';

export function UserProfilePage() {
  const [activeTab, setActiveTab] = useState<'liked' | 'stores'>('liked');
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <ProfileHeader />
        <ProfileStatsGrid />

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'liked' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('liked')}
          >
            <Heart className="h-4 w-4 mr-2" />
            Liked Products
          </Button>
          <Button
            variant={activeTab === 'stores' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('stores')}
          >
            <Store className="h-4 w-4 mr-2" />
            Followed Stores
          </Button>
        </div>

        {activeTab === 'liked' ? <LikedProductsTab /> : <FollowedStoresTab />}
      </div>
    </div>
  );
}
