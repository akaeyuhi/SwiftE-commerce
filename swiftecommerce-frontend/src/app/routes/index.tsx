import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

// Layouts
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { StoreLayout } from '../layouts/StoreLayout';

// Public Pages
import { HomePage } from '@/features/home/pages/HomePage';
import { StoresPage } from '@/features/stores/pages/StoresPage';
import { StorePublicPage } from '@/features/stores/pages/StorePublicPage';
import { StoreSearchPage } from '@/features/stores/pages/StoreSearchPage';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';

// Auth Pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';

// User Store Pages
import { MyStoresPage } from '@/features/stores/pages/MyStoresPage';
import { CreateStorePage } from '@/features/stores/pages/CreateStorePage';
import { NewsPostPage } from '@/features/news/pages/NewsPostPage.tsx';

// Store Management Pages
import { StoreOverviewPage } from '@/features/stores/pages/StoreOverviewPage';
import { StoreSettingsPage } from '@/features/stores/pages/StoreSettingsPage';
import { TeamManagementPage } from '@/features/stores/pages/TeamManagementPage';
import { StoreProductsPage } from '@/features/products/pages/StoreProductsPage';
import { StoreAnalyticsPage } from '@/features/analytics/pages/StoreAnalyticsPage';

// Store Admin Pages
import { StoreOrdersPage } from '@/features/orders/pages/StoreOrdersPage';
import { StoreOrderDetailPage } from '@/features/orders/pages/StoreOrderDetailPage';
import { ReviewManagementPage } from '@/features/reviews/pages/ReviewsManagementPage';
import { NewsManagementPage } from '@/features/news/pages/NewsManagementPage';
import { CreateNewsPage } from '@/features/news/pages/CreateNewsPage';
import { EditNewsPage } from '@/features/news/pages/EditNewsPage';
import { StoreNewsPage } from '@/features/news/pages/StoreNewsPage';
import { InventoryManagementPage } from '@/features/inventory/pages/InventoryManagementPage';
import { CategoriesManagementPage } from '@/features/categories/pages/CategoriesManagementPage';
import { AIFunctionalityPage } from '@/features/ai/pages/AiFunctionalityPage';

// Product Pages
import { CreateProductPage } from '@/features/products/pages/CreateProductPage';
import { EditProductPage } from '@/features/products/pages/EditProductPage';

// Cart & Checkout
import { CartPage } from '@/features/cart/pages/CartPage';
import { CheckoutPage } from '@/features/orders/pages/CheckoutPage';

// Orders
import { OrdersPage } from '@/features/orders/pages/OrdersPage';
import { TrackOrderPage } from '@/features/orders/pages/TrackOrderPage.tsx';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage.tsx';

// User Profile
import { UserProfilePage } from '@/features/users/pages/UserProfilePage';
import { UserSettingsPage } from '@/features/users/pages/UserSettingsPage.tsx';
import { WishlistPage } from '@/features/users/pages/WishlistPage.tsx';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage.tsx';
import { DashboardLayout } from '@/app/layouts/DashboardLayout.tsx';

// Error Pages
import { UnauthorizedPage } from '@/shared/components/feedback/UnathorizedPage';
import { NotFoundPage } from '@/shared/components/feedback/NotFoundPage';

// Legal pages
import { CookiePolicyPage } from '@/features/legal/pages/CookiePolicyPage';
import { PrivacyPolicyPage } from '@/features/legal/pages/PrivacyPolicyPage.tsx';
import { TermsOfServicePage } from '@/features/legal/pages/TermsOfServicePage.tsx';
import { ReturnsPage } from '@/features/legal/pages/ReturnsPage.tsx';
import { ShippingPage } from '@/features/legal/pages/ShippingPage.tsx';
import { FAQPage } from '@/features/legal/pages/FAQPage.tsx';
import { ContactPage } from '@/features/legal/pages/ContactPage.tsx';
import { AboutUsPage } from '@/features/legal/pages/AboutUsPage.tsx';

// Admin pages
import { AdminLayout } from '@/app/layouts/AdminLayout.tsx';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage.tsx';
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage.tsx';
import { AdminStoresPage } from '@/features/admin/pages/AdminStoresPage';
import { AdminProductsPage } from '@/features/admin/pages/AdminProductsPage.tsx';
import { AdminReportsPage } from '@/features/admin/pages/AdminReportsPage.tsx';
import { AdminSettingsPage } from '@/features/admin/pages/AdminSettingsPage.tsx';
import { AdminLogsPage } from '@/features/admin/pages/AdminLogsPage.tsx';
import { AdminUserDetailPage } from '@/features/admin/pages/AdminUserDetailPage.tsx';
import { AdminOrdersPage } from '@/features/admin/pages/AdminOrdersPage.tsx';

import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary.tsx';
import { AdminRoles } from '@/lib/enums/site-roles.enum.ts';
import { StoreRoles } from '@/lib/enums/store-roles.enum.ts';

export const router = createBrowserRouter([
  // Admin Routes
  {
    path: '/admin',
    element: (
      <ErrorBoundary title="Admin page error">
        <RoleRoute allowedSiteRoles={[AdminRoles.ADMIN, AdminRoles.USER]}>
          <AdminLayout />
        </RoleRoute>
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'users/:userId',
        element: <AdminUserDetailPage />,
      },
      {
        path: 'orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'stores',
        element: <AdminStoresPage />,
      },
      {
        path: 'products',
        element: <AdminProductsPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />,
      },
      {
        path: 'logs',
        element: <AdminLogsPage />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <RootLayout />
      </ErrorBoundary>
    ),
    children: [
      // Home
      {
        index: true,
        element: <HomePage />,
      },

      // Public Stores
      {
        path: ROUTES.STORES,
        element: <StoresPage />,
      },
      {
        path: ROUTES.STORE_PUBLIC,
        element: <StorePublicPage />,
      },
      {
        path: ROUTES.NEWS_POST,
        element: <NewsPostPage />,
      },

      // Store news
      {
        path: ROUTES.STORE_NEWS,
        element: <StoreNewsPage />,
      },
      {
        path: ROUTES.STORE_SEARCH,
        element: <StoreSearchPage />,
      },

      // Public Products
      {
        path: ROUTES.PRODUCTS,
        element: <ProductsPage />,
      },
      {
        path: ROUTES.PRODUCT_DETAIL,
        element: <ProductDetailPage />,
      },

      // Cart
      {
        path: ROUTES.CART,
        element: <CartPage />,
      },

      {
        path: ROUTES.ABOUT,
        element: <AboutUsPage />,
      },
      {
        path: ROUTES.CONTACT,
        element: <ContactPage />,
      },
      {
        path: ROUTES.FAQ,
        element: <FAQPage />,
      },
      {
        path: ROUTES.SHIPPING,
        element: <ShippingPage />,
      },
      {
        path: ROUTES.RETURNS,
        element: <ReturnsPage />,
      },
      {
        path: ROUTES.PRIVACY,
        element: <PrivacyPolicyPage />,
      },
      {
        path: ROUTES.TERMS,
        element: <TermsOfServicePage />,
      },
      {
        path: ROUTES.COOKIES,
        element: <CookiePolicyPage />,
      },
      {
        path: ROUTES.TRACK_ORDER,
        element: <TrackOrderPage />,
      },

      // Auth Routes (Public)
      {
        element: <AuthLayout />,
        children: [
          {
            path: ROUTES.LOGIN,
            element: <LoginPage />,
          },
          {
            path: ROUTES.REGISTER,
            element: <RegisterPage />,
          },
          {
            path: ROUTES.FORGOT_PASSWORD,
            element: <ForgotPasswordPage />,
          },
        ],
      },

      // Protected Routes (Authenticated Users)
      {
        element: <ProtectedRoute />,
        children: [
          // Checkout
          {
            path: ROUTES.CHECKOUT,
            element: <CheckoutPage />,
          },

          // User Profile
          {
            path: ROUTES.USER_PROFILE,
            element: <UserProfilePage />,
          },

          // My Stores
          {
            path: ROUTES.MY_STORES,
            element: <MyStoresPage />,
          },

          // Dashboard
          {
            element: <DashboardLayout />,
            children: [
              {
                path: ROUTES.DASHBOARD,
                element: <DashboardPage />,
              },
              // Orders
              {
                path: ROUTES.ORDERS,
                element: <OrdersPage />,
              },
              {
                path: ROUTES.ORDER_DETAIL,
                element: <OrderDetailPage />,
              },

              {
                path: ROUTES.WISHLIST,
                element: <WishlistPage />,
              },
              {
                path: ROUTES.USER_SETTINGS,
                element: <UserSettingsPage />,
              },
            ],
          },

          // Create Store
          {
            path: ROUTES.STORE_CREATE,
            element: <CreateStorePage />,
          },

          // Store Management (Requires Store Access)
          {
            path: ROUTES.STORE,
            element: (
              <RoleRoute
                requireStoreAccess
                allowedStoreRoles={[
                  StoreRoles.ADMIN,
                  StoreRoles.MODERATOR,
                  StoreRoles.GUEST,
                ]}
              >
                <ErrorBoundary title="Store Error">
                  <StoreLayout />
                </ErrorBoundary>
              </RoleRoute>
            ),
            children: [
              {
                index: true,
                element: <Navigate to="overview" replace />,
              },
              {
                path: 'overview',
                element: <StoreOverviewPage />,
              },
              {
                path: 'settings',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN]}
                  >
                    <StoreSettingsPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'team',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN, StoreRoles.MODERATOR]}
                  >
                    <TeamManagementPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'analytics',
                element: <StoreAnalyticsPage />,
              },

              // Products
              {
                path: 'products',
                element: <StoreProductsPage />,
              },
              {
                path: 'products/create',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN, StoreRoles.MODERATOR]}
                  >
                    <CreateProductPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'products/:productId/edit',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN, StoreRoles.MODERATOR]}
                  >
                    <EditProductPage />
                  </RoleRoute>
                ),
              },

              // Orders Management
              {
                path: 'orders',
                element: <StoreOrdersPage />,
              },
              {
                path: 'orders/:orderId',
                element: <StoreOrderDetailPage />,
              },

              // Reviews Management
              {
                path: 'reviews',
                element: <ReviewManagementPage />,
              },

              // News Management
              {
                path: 'news/management',
                element: <NewsManagementPage />,
              },
              {
                path: 'news/create',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN, StoreRoles.MODERATOR]}
                  >
                    <CreateNewsPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'news/:newsId/edit',
                element: (
                  <RoleRoute
                    requireStoreAccess
                    allowedStoreRoles={[StoreRoles.ADMIN, StoreRoles.MODERATOR]}
                  >
                    <EditNewsPage />
                  </RoleRoute>
                ),
              },

              // Inventory
              {
                path: 'inventory',
                element: <InventoryManagementPage />,
              },

              // Categories
              {
                path: 'categories',
                element: <CategoriesManagementPage />,
              },

              // AI Tools
              {
                path: 'ai',
                element: <AIFunctionalityPage />,
              },
            ],
          },
        ],
      },

      // Error Pages
      {
        path: ROUTES.UNAUTHORIZED,
        element: <UnauthorizedPage />,
      },
      {
        path: ROUTES.NOT_FOUND,
        element: <NotFoundPage />,
      },
    ],
  },
]);
