export interface Notification {
  id: string;
  type: 'order' | 'review' | 'product' | 'store' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'New Order Received',
    message: 'Order #ORD-2024-003 has been placed',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    actionUrl: '/store/1/orders',
  },
  {
    id: '2',
    type: 'review',
    title: 'New Review',
    message: 'Someone left a 5-star review on Wireless Headphones Pro',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    actionUrl: '/store/1/reviews',
  },
  {
    id: '3',
    type: 'product',
    title: 'Low Stock Alert',
    message: 'USB-C Cable is running low on stock (5 units remaining)',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actionUrl: '/store/1/inventory',
  },
  {
    id: '4',
    type: 'system',
    title: 'Account Verification',
    message: 'Your email has been successfully verified',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
];

export const getUnreadCount = () =>
  mockNotifications.filter((n) => !n.read).length;
