import {
  NavigateOptions,
  useNavigate as useRouterNavigate,
} from 'react-router-dom';
import { ROUTES, buildRoute } from '@/app/routes/routes';

export function useNavigate() {
  const navigate = useRouterNavigate();

  return {
    // Core
    to: (path: string, options?: NavigateOptions) => navigate(path, options),
    back: () => navigate(-1),

    // Public
    toHome: () => navigate(ROUTES.HOME),
    toLogin: () => navigate(ROUTES.LOGIN),
    toRegister: () => navigate(ROUTES.REGISTER),

    // Stores
    toStores: () => navigate(ROUTES.STORES),
    toStorePublic: (storeId: string) =>
      navigate(buildRoute.storePublic(storeId)),

    // My Stores
    toMyStores: () => navigate(ROUTES.MY_STORES),
    toCreateStore: () => navigate(ROUTES.STORE_CREATE),

    // Store Management (with storeId)
    toStoreOverview: (storeId: string) =>
      navigate(buildRoute.storeOverview(storeId)),
    toStoreSettings: (storeId: string) =>
      navigate(buildRoute.storeSettings(storeId)),
    toStoreTeam: (storeId: string) => navigate(buildRoute.storeTeam(storeId)),
    toStoreAnalytics: (storeId: string) =>
      navigate(buildRoute.storeAnalytics(storeId)),
    toStoreProducts: (storeId: string) =>
      navigate(buildRoute.storeProducts(storeId)),
    toStoreProductCreate: (storeId: string, options?: NavigateOptions) =>
      navigate(buildRoute.storeProductCreate(storeId), options),
    toStoreProductEdit: (storeId: string, productId: string) =>
      navigate(buildRoute.storeProductEdit(storeId, productId)),
    toStoreOrders: (storeId: string) =>
      navigate(buildRoute.storeOrders(storeId)),
    toStoreOrder: (storeId: string, orderId: string) =>
      navigate(buildRoute.storeOrderDetail(storeId, orderId)),

    // Products (public)
    toProducts: () => navigate(ROUTES.PRODUCTS),
    toProduct: (productId: string) =>
      navigate(buildRoute.productDetail(productId)),

    // Cart & Checkout
    toCart: () => navigate(ROUTES.CART),
    toCheckout: () => navigate(ROUTES.CHECKOUT),

    // Orders
    toOrders: () => navigate(ROUTES.ORDERS),
    toOrder: (storeId: string, orderId: string) =>
      navigate(buildRoute.orderDetail(storeId, orderId)),

    // Dashboard
    toDashboard: () => navigate(ROUTES.DASHBOARD),

    // Error
    toUnauthorized: () => navigate(ROUTES.UNAUTHORIZED),
  };
}
