export interface MockOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: Array<{
    id: string;
    productName: string;
    variantSku: string;
    quantity: number;
    price: number;
    attributes?: Record<string, string>;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const mockOrders: MockOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    storeId: '1',
    storeName: 'Tech Haven',
    status: 'delivered',
    items: [
      {
        id: '1',
        productName: 'Wireless Headphones Pro',
        variantSku: 'WHP-BLK-001',
        quantity: 1,
        price: 299.99,
        attributes: { color: 'Matte Black', size: 'Standard' },
      },
    ],
    subtotal: 299.99,
    shipping: 0,
    tax: 24.0,
    total: 323.99,
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
    },
    createdAt: '2024-10-15T10:30:00Z',
    updatedAt: '2024-10-18T14:20:00Z',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    storeId: '1',
    storeName: 'Tech Haven',
    status: 'shipped',
    items: [
      {
        id: '2',
        productName: 'Smart Fitness Watch Ultra',
        variantSku: 'SFW-M-BLK-001',
        quantity: 1,
        price: 399.99,
        attributes: { size: 'Medium (42mm)', color: 'Black' },
      },
    ],
    subtotal: 399.99,
    shipping: 0,
    tax: 32.0,
    total: 431.99,
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
    },
    createdAt: '2024-10-20T09:15:00Z',
    updatedAt: '2024-10-22T16:45:00Z',
  },
];
