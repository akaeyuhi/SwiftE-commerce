export interface CreateOrderData {
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
}

export interface UpdateOrderStatusData {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
