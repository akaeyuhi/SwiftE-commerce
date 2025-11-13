import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { useAuth } from '@/app/store';
import { User, Settings } from 'lucide-react';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useUserProfile } from '../../hooks/useUsers';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';

export function ProfileHeader() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useUserProfile({
    enabled: !!authUser,
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <SkeletonLoader variant="circle" height="h-24" width="w-24" />
            <div className="flex-1">
              <SkeletonLoader count={2} className="max-w-sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const user = profile || authUser;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div
            className="h-24 w-24 rounded-full bg-primary/10 flex
            items-center justify-center flex-shrink-0"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-primary" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-muted-foreground mb-3">{user?.email}</p>
            <div className="flex gap-2">
              <Badge variant="default">
                {user?.siteRole === 'SITE_ADMIN' ? 'Admin' : 'User'}
              </Badge>
              {user?.isEmailVerified && (
                <Badge variant="success">Email Verified</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <Button variant="outline" onClick={() => navigate.to(`/settings`)}>
            <Settings className="h-4 w-4 mr-2" />
            Profile settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
