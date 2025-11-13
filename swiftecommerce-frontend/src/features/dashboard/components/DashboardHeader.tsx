import { useAuth } from '@/app/store';

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Welcome back, {user?.firstName}! 👋
      </h1>
      <p className="text-muted-foreground">
        Here&#39;s what&#39;s happening with your account
      </p>
    </div>
  );
}
