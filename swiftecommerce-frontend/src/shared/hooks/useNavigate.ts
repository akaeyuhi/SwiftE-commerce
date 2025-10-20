import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { ROUTES, buildRoute } from '@/app/routes/routes.ts';

/**
 * Type-safe navigation hook
 */
export function useNavigate() {
  const navigate = useRouterNavigate();

  return {
    // Direct navigation
    toHome: () => navigate(ROUTES.HOME),
    toLogin: () => navigate(ROUTES.LOGIN),
    toRegister: () => navigate(ROUTES.REGISTER),
    toDashboard: () => navigate(ROUTES.DASHBOARD),
    toProducts: () => navigate(ROUTES.PRODUCTS),
    toCart: () => navigate(ROUTES.CART),
    toCheckout: () => navigate(ROUTES.CHECKOUT),
    toOrders: () => navigate(ROUTES.ORDERS),
    toStore: () => navigate(ROUTES.STORE),

    // Parametrized navigation
    toProductDetail: (productId: string) =>
      navigate(buildRoute.productDetail(productId)),
    toOrderDetail: (orderId: string) =>
      navigate(buildRoute.orderDetail(orderId)),
    toStoreProductEdit: (productId: string) =>
      navigate(buildRoute.storeProductEdit(productId)),

    // Generic navigation
    to: (path: string) => navigate(path),
    back: () => navigate(-1),
    forward: () => navigate(1),
  };
}
