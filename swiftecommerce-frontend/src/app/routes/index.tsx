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
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';

// Auth Pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';

// User Store Pages
import { MyStoresPage } from '@/features/stores/pages/MyStoresPage';
import { CreateStorePage } from '@/features/stores/pages/CreateStorePage';

// Store Management Pages
import { StoreOverviewPage } from '@/features/stores/pages/StoreOverviewPage';
import { StoreSettingsPage } from '@/features/stores/pages/StoreSettingsPage';
import { TeamManagementPage } from '@/features/stores/pages/TeamManagementPage';
import { StoreProductsPage } from '@/features/products/pages/StoreProductsPage';
import { StoreAnalyticsPage } from '@/features/analytics/pages/StoreAnalyticsPage';

// NEW: Store Admin Pages
import { StoreOrdersPage } from '@/features/orders/pages/StoreOrdersPage';
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

// User Profile
import { UserProfilePage } from '@/features/users/pages/UserProfilePage';

// Error Pages
import { UnauthorizedPage } from '@/shared/components/feedback/UnathorizedPage';
import { NotFoundPage } from '@/shared/components/feedback/NotFoundPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
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

      // Public Products
      {
        path: ROUTES.PRODUCTS,
        element: <ProductsPage />,
      },
      {
        path: ROUTES.PRODUCT_DETAIL,
        element: <ProductDetailPage />,
      },

      // Store news
      {
        path: ROUTES.STORE_NEWS,
        element: <StoreNewsPage />,
      },

      // Cart
      {
        path: ROUTES.CART,
        element: <CartPage />,
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

          // Orders
          {
            path: ROUTES.ORDERS,
            element: <OrdersPage />,
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
            path: ROUTES.DASHBOARD,
            element: <DashboardPage />,
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
                  'STORE_ADMIN',
                  'STORE_MODERATOR',
                  'STORE_GUEST',
                ]}
              >
                <StoreLayout />
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
                    allowedStoreRoles={['STORE_ADMIN']}
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
                    allowedStoreRoles={['STORE_ADMIN']}
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
                    allowedStoreRoles={['STORE_ADMIN', 'STORE_MODERATOR']}
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
                    allowedStoreRoles={['STORE_ADMIN', 'STORE_MODERATOR']}
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
                    allowedStoreRoles={['STORE_ADMIN', 'STORE_MODERATOR']}
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
                    allowedStoreRoles={['STORE_ADMIN', 'STORE_MODERATOR']}
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
