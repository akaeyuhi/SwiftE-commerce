import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';
import {
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';

describe('Notifications - Orders (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let orderNotificationService: OrderNotificationService;

  let customer: any;
  let store: any;
  let order: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [NotificationsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    orderNotificationService = app.get(OrderNotificationService);

    const storeOwner = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    const orders = await seeder.seedOrders(store, customer.user, 1);
    order = orders[0];
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['orders', 'order_notification_logs']);
  });

  describe('Order Confirmation Notifications', () => {
    it('should send order confirmation', async () => {
      await orderNotificationService.notifyOrderConfirmation(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          totalAmount: order.totalAmount,
          orderDate: order.createdAt,
          orderUrl: `https://example.com/orders/${order.id}`,
          shippingAddress: order.shipping,
          shippingMethod: 'Standard Shipping',
          items: order.items.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          shippingAddressLine1: '',
          shippingCity: '',
          shippingPostalCode: '',
          shippingCountry: '',
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const logs = await logRepo.find({ where: { orderId: order.id } });

      expect(logs.length).toBe(1);
      expect(logs[0].notificationType).toBe(
        NotificationType.ORDER_CONFIRMATION
      );
      expect(logs[0].status).toBe(NotificationStatus.SENT);
    });
  });

  describe('Order Shipped Notifications', () => {
    it('should send order shipped notification', async () => {
      await orderNotificationService.notifyOrderShipped(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          trackingNumber: '1Z999AA10123456784',
          trackingUrl: 'https://ups.com/track/1Z999AA10123456784',
          estimatedDeliveryDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          shippingMethod: 'UPS Ground',
          shippedDate: new Date().toISOString(),
          shippingAddress: order.shipping,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
          })),
          totalAmount: 0,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const logs = await logRepo.find({ where: { orderId: order.id } });

      expect(logs[0].notificationType).toBe(NotificationType.ORDER_SHIPPED);
    });
  });

  describe('Order Delivered Notifications', () => {
    it('should send order delivered notification', async () => {
      await orderNotificationService.notifyOrderDelivered(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          deliveredDate: new Date().toISOString(),
          shippingAddress: order.shipping,
          reviewUrl: `https://example.com/orders/${order.id}/review`,
          supportUrl: `https://example.com/support`,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
          })),
          totalAmount: 0,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const logs = await logRepo.find({ where: { orderId: order.id } });

      expect(logs[0].notificationType).toBe(NotificationType.ORDER_DELIVERED);
    });
  });

  describe('Order Cancelled Notifications', () => {
    it('should send order cancelled notification', async () => {
      await orderNotificationService.notifyOrderCancelled(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          cancelledDate: new Date().toISOString(),
          cancellationReason: 'Customer requested',
          refundAmount: order.totalAmount,
          refundMethod: 'Original payment method',
          items: order.items,
          totalAmount: 0,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const logs = await logRepo.find({ where: { orderId: order.id } });

      expect(logs[0].notificationType).toBe(NotificationType.ORDER_CANCELLED);
    });
  });

  describe('Notification Statistics', () => {
    beforeEach(async () => {
      // Send multiple notifications
      await orderNotificationService.notifyOrderConfirmation(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          totalAmount: order.totalAmount,
          orderDate: order.createdAt,
          orderUrl: `https://example.com/orders/${order.id}`,
          shippingAddress: order.shipping,
          items: [],
          shippingAddressLine1: '',
          shippingCity: '',
          shippingPostalCode: '',
          shippingCountry: '',
        }
      );

      await orderNotificationService.notifyOrderShipped(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: order.id,
          orderNumber: `ORD-${order.id.substring(0, 8)}`,
          storeId: store.id,
          userId: customer.user.id,
          storeName: store.name,
          trackingNumber: '123',
          trackingUrl: 'https://example.com',
          estimatedDeliveryDate: new Date().toISOString(),
          shippingMethod: 'Standard',
          shippedDate: new Date().toISOString(),
          shippingAddress: order.shipping,
          items: [],
          totalAmount: 0,
        }
      );
    });

    it('should get order notification statistics', async () => {
      const stats = await orderNotificationService.getOrderNotificationStats(
        order.id
      );

      expect(stats.total).toBe(2);
      expect(stats.sent).toBe(2);
      expect(stats.byType[NotificationType.ORDER_CONFIRMATION]).toBe(1);
      expect(stats.byType[NotificationType.ORDER_SHIPPED]).toBe(1);
    });

    it('should get store notification statistics', async () => {
      const since = new Date(Date.now() - 86400000);

      const stats = await orderNotificationService.getStoreNotificationStats(
        store.id,
        since
      );

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.sent).toBeGreaterThan(0);
    });
  });
});
