import { createBrowserRouter /*, Navigate*/ } from 'react-router-dom';
import { ROUTES } from './routes';
// import { ProtectedRoute } from './ProtectedRoute';
// import { RoleRoute } from './RoleRoute';

// Layouts
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
// import { DashboardLayout } from '../layouts/DashboardLayout';
// import { StoreLayout } from '../layouts/StoreLayout';

// Auth pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
//
// // Product pages
// import { ProductsPage } from '@/features/products/pages/ProductsPage';
// import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
//
// // Cart & Checkout
// import { CartPage } from '@/features/cart/pages/CartPage';
// import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
//
// // Dashboard pages
// import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
// import { AnalyticsPage } from '@/features/dashboard/pages/AnalyticsPage';
//
// // Order pages
// import { OrdersPage } from '@/features/orders/pages/OrdersPage';
// import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
//
// // Store pages

// import { StoreSettingsPage } from '@/features/store/pages/StoreSettingsPage';
// import { StoreAnalyticsPage } from '@/features/store/pages/StoreAnalyticsPage';
// import { StoreProductsPage } from '@/features/store/pages/StoreProductsPage';
// import { CreateProductPage } from '@/features/products/pages/CreateProductPage';
// import { EditProductPage } from '@/features/products/pages/EditProductPage';
// import { StoreOrdersPage } from '@/features/store/pages/StoreOrdersPage';

// Error pages
import { HomePage } from '@/features/home/pages/HomePage';
import { UnauthorizedPage } from '@/shared/components/feedback/UnathorizedPage.tsx';
import { NotFoundPage } from '@/shared/components/feedback/NotFoundPage.tsx';

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

      // Auth routes
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
      //
      // // Public product routes
      // {
      //   path: ROUTES.PRODUCTS,
      //   element: <ProductsPage />,
      // },
      // {
      //   path: ROUTES.PRODUCT_DETAIL,
      //   element: <ProductDetailPage />,
      // },
      //
      // // Cart
      // {
      //   path: ROUTES.CART,
      //   element: <CartPage />,
      // },
      //
      // // Protected routes
      // {
      //   element: <ProtectedRoute />,
      //   children: [
      //     // Checkout
      //     {
      //       path: ROUTES.CHECKOUT,
      //       element: <CheckoutPage />,
      //     },
      //
      //     // Dashboard
      //     {
      //       path: ROUTES.DASHBOARD,
      //       element: <DashboardLayout />,
      //       children: [
      //         {
      //           index: true,
      //           element: <DashboardPage />,
      //         },
      //         {
      //           path: ROUTES.ANALYTICS,
      //           element: <AnalyticsPage />,
      //         },
      //       ],
      //     },
      //
      //     // Orders
      //     {
      //       path: ROUTES.ORDERS,
      //       element: <OrdersPage />,
      //     },
      //     {
      //       path: ROUTES.ORDER_DETAIL,
      //       element: <OrderDetailPage />,
      //     },
      //   ],
      // },
      //
      // // Store Owner routes
      // {
      //   element: (
      //     <RoleRoute allowedRoles={['store_owner', 'admin']}>
      //       <StoreLayout />
      //     </RoleRoute>
      //   ),
      //   children: [
      //     {
      //       path: ROUTES.STORE,
      //       element: <Navigate to={ROUTES.STORE_PRODUCTS} replace />,
      //     },
      //     {
      //       path: ROUTES.STORE_SETTINGS,
      //       element: <StoreSettingsPage />,
      //     },
      //     {
      //       path: ROUTES.STORE_ANALYTICS,
      //       element: <StoreAnalyticsPage />,
      //     },
      //     {
      //       path: ROUTES.STORE_PRODUCTS,
      //       element: <StoreProductsPage />,
      //     },
      //     {
      //       path: ROUTES.STORE_PRODUCTS_CREATE,
      //       element: <CreateProductPage />,
      //     },
      //     {
      //       path: ROUTES.STORE_PRODUCTS_EDIT,
      //       element: <EditProductPage />,
      //     },
      //     {
      //       path: ROUTES.STORE_ORDERS,
      //       element: <StoreOrdersPage />,
      //     },
      //   ],
      // },

      // Error pages
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
