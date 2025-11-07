import { Outlet } from 'react-router-dom';
import { Header } from '@/shared/components/layout/Header';
import { Footer } from '@/shared/components/layout/Footer';
import { WishlistSync } from '@/features/likes/components/WishlistSync';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <WishlistSync />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
