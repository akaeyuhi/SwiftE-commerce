import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import {
  CreateOrderData,
  CreateOrderRequest,
  Order,
  UpdateOrderStatusData,
} from '../types/order.types';

export class OrdersService extends BaseService {
  /**
   * Get all orders
   */
  async getOrders(
    storeId: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ): Promise<PaginatedResponse<Order>> {
    const url = this.buildUrl(API_ENDPOINTS.ORDERS.LIST, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    const response = await this.client.get<any>(urlWithParams);
    return this.handlePaginatedResponse<Order>(response);
  }

  /**
   * Get single order
   */
  async getOrder(storeId: string, orderId: string): Promise<Order> {
    const url = this.buildUrl(API_ENDPOINTS.ORDERS.DETAIL, {
      storeId,
      id: orderId,
    });
    return this.client.get<Order>(url);
  }

  /**
   * Create new order
   */
  async createOrder(storeId: string, data: CreateOrderData): Promise<Order> {
    const url = this.buildUrl(API_ENDPOINTS.ORDERS.CREATE, { storeId });
    return this.client.post<Order>(url, data);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    storeId: string,
    orderId: string,
    data: UpdateOrderStatusData
  ): Promise<Order> {
    const url = this.buildUrl(API_ENDPOINTS.ORDERS.UPDATE_STATUS, {
      storeId,
      id: orderId,
    });
    return this.client.put<Order>(url, data);
  }

  /**
   * Cancel order
   */
  async cancelOrder(storeId: string, orderId: string): Promise<Order> {
    const url = this.buildUrl(API_ENDPOINTS.ORDERS.CANCEL, {
      storeId,
      id: orderId,
    });
    return this.client.post<Order>(url);
  }

  /**
   * Create user order (new endpoint)
   */
  async createUserOrder(
    storeId: string,
    userId: string,
    data: CreateOrderRequest
  ): Promise<Order> {
    const url = buildUrl(API_ENDPOINTS.ORDERS.CREATE_USER_ORDER, {
      storeId,
      userId,
    });
    return this.client.post<Order>(url, data);
  }

  /**
   * Get inventory impact
   */
  async getInventoryImpact(storeId: string, orderId: string): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ORDERS.INVENTORY_IMPACT, {
      storeId,
      id: orderId,
    });
    return this.client.get(url);
  }

  /**
   * Update shipping info
   */
  async updateShipping(
    storeId: string,
    orderId: string,
    data: {
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    }
  ): Promise<Order> {
    const url = buildUrl(API_ENDPOINTS.ORDERS.UPDATE_SHIPPING, {
      storeId,
      id: orderId,
    });
    return this.client.put<Order>(url, data);
  }

  /**
   * Mark as delivered
   */
  async markAsDelivered(storeId: string, orderId: string): Promise<Order> {
    const url = buildUrl(API_ENDPOINTS.ORDERS.MARK_DELIVERED, {
      storeId,
      id: orderId,
    });
    return this.client.post<Order>(url);
  }
}

export const ordersService = new OrdersService();
