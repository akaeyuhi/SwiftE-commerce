import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import {
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';

describe('Notifications - Inventory (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let inventoryNotificationService: InventoryNotificationService;

  let storeOwner: any;
  let store: any;
  let product: any;
  let variant: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        NotificationsModule,
        StoreModule,
        ProductsModule,
        AuthModule,
        UserModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    inventoryNotificationService = app.get(InventoryNotificationService);

    storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
    const variants = await seeder.seedVariants(product, 1);
    variant = variants[0];
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables([
      'stores',
      'products',
      'product_variants',
      'inventory_notification_logs',
    ]);
  });

  describe('Low Stock Notifications', () => {
    it('should send low stock notification', async () => {
      await inventoryNotificationService.notifyLowStock(
        storeOwner.user.email,
        storeOwner.user.firstName,
        {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          category: 'Electronics',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          storeName: store.name,
          estimatedDays: 2,
          isCritical: false,
          inventoryManagementUrl: `https://example.com/stores/${store.id}/inventory`,
        }
      );

      // Verify log was created
      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const logs = await logRepo.find({ where: { productId: product.id } });

      expect(logs.length).toBe(1);
      expect(logs[0].notificationType).toBe(
        NotificationType.INVENTORY_LOW_STOCK
      );
      expect(logs[0].recipient).toBe(storeOwner.user.email);
      expect(logs[0].status).toBe(NotificationStatus.SENT);
    });

    it('should send critical low stock notification', async () => {
      await inventoryNotificationService.notifyLowStock(
        storeOwner.user.email,
        storeOwner.user.firstName,
        {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          category: 'Electronics',
          currentStock: 2,
          threshold: 10,
          storeName: store.name,
          recentSales: 25,
          estimatedDays: 0,
          isCritical: true,
          inventoryManagementUrl: `https://example.com/stores/${store.id}/inventory`,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const logs = await logRepo.find({ where: { productId: product.id } });

      expect(logs[0].metadata.severity).toBe('critical');
    });

    it('should validate required fields', async () => {
      await expect(
        inventoryNotificationService.notifyLowStock(
          storeOwner.user.email,
          storeOwner.user.firstName,
          {
            storeId: store.id,
            productId: null, // Missing required field
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            category: 'Electronics',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
            isCritical: false,
            inventoryManagementUrl: 'https://example.com',
          } as any
        )
      ).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(
        inventoryNotificationService.notifyLowStock(
          'invalid-email',
          'Test User',
          {
            storeId: store.id,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            category: 'Electronics',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
            storeName: store.name,
            isCritical: false,
            inventoryManagementUrl: 'https://example.com',
          }
        )
      ).rejects.toThrow('Invalid email');
    });
  });

  describe('Out of Stock Notifications', () => {
    it('should send out of stock notification', async () => {
      await inventoryNotificationService.notifyOutOfStock(
        storeOwner.user.email,
        storeOwner.user.firstName,
        {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          storeName: store.name,
          category: 'Electronics',
          inventoryManagementUrl: `https://example.com/stores/${store.id}/inventory`,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const logs = await logRepo.find({ where: { productId: product.id } });

      expect(logs.length).toBe(1);
      expect(logs[0].notificationType).toBe(
        NotificationType.INVENTORY_OUT_OF_STOCK
      );
      expect(logs[0].metadata.severity).toBe('critical');
    });
  });

  describe('Batch Notifications', () => {
    it('should send notifications to multiple recipients', async () => {
      const recipients = [
        { email: 'admin1@example.com', name: 'Admin 1' },
        { email: 'admin2@example.com', name: 'Admin 2' },
        { email: 'admin3@example.com', name: 'Admin 3' },
      ];

      const notificationData = {
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        sku: variant.sku,
        category: 'Electronics',
        currentStock: 3,
        threshold: 10,
        recentSales: 20,
        storeName: store.name,
        estimatedDays: 1,
        isCritical: true,
        inventoryManagementUrl: `https://example.com/stores/${store.id}/inventory`,
      };

      const payloads = recipients.map((recipient) => ({
        recipient: recipient.email,
        recipientName: recipient.name,
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: notificationData,
        metadata: { sentAt: new Date().toISOString() },
      }));

      const results = await inventoryNotificationService.notifyBatch(payloads);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);

      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const logs = await logRepo.find({ where: { productId: product.id } });
      expect(logs.length).toBe(3);
    });
  });

  describe('Scheduled Notifications', () => {
    it('should schedule notification for future delivery', async () => {
      const scheduledFor = new Date(Date.now() + 60000); // 1 minute from now

      const logId = await inventoryNotificationService.scheduleNotification(
        {
          recipient: storeOwner.user.email,
          recipientName: storeOwner.user.firstName,
          notificationType: NotificationType.INVENTORY_LOW_STOCK,
          data: {
            storeId: store.id,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            category: 'Electronics',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
            isCritical: false,
            inventoryManagementUrl: 'https://example.com',
            storeName: store.name,
          },
        },
        scheduledFor
      );

      expect(logId).toBeDefined();

      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const log = await logRepo.findOne({ where: { id: logId } });

      expect(log?.status).toBe(NotificationStatus.PENDING);
      expect(log?.metadata.scheduledFor).toBeDefined();
    });
  });

  describe('Notification Statistics', () => {
    beforeEach(async () => {
      // Seed some notifications
      await inventoryNotificationService.notifyLowStock(
        storeOwner.user.email,
        storeOwner.user.firstName,
        {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          category: 'Electronics',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 2,
          isCritical: false,
          inventoryManagementUrl: 'https://example.com',
          storeName: store.name,
        }
      );

      await inventoryNotificationService.notifyOutOfStock(
        storeOwner.user.email,
        storeOwner.user.firstName,
        {
          storeId: store.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          category: 'Electronics',
          inventoryManagementUrl: 'https://example.com',
          storeName: store.name,
        }
      );
    });

    it('should get store notification statistics', async () => {
      const since = new Date(Date.now() - 86400000); // Last 24 hours

      const stats =
        await inventoryNotificationService.getStoreNotificationStats(
          store.id,
          since
        );

      expect(stats.total).toBe(2);
      expect(stats.sent).toBe(2);
      expect(stats.byType[NotificationType.INVENTORY_LOW_STOCK]).toBe(1);
      expect(stats.byType[NotificationType.INVENTORY_OUT_OF_STOCK]).toBe(1);
    });
  });

  describe('Retry Logic', () => {
    it('should handle failed notifications with retry', async () => {
      // Mock email service to fail
      const emailQueueService = app.get('EmailQueueService');
      jest
        .spyOn(emailQueueService, 'sendLowStockWarning')
        .mockRejectedValueOnce(new Error('Email service unavailable'));

      try {
        await inventoryNotificationService.notifyLowStock(
          storeOwner.user.email,
          storeOwner.user.firstName,
          {
            storeId: store.id,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            storeName: store.name,
            sku: variant.sku,
            category: 'Electronics',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
            isCritical: false,
            inventoryManagementUrl: 'https://example.com',
          }
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Expected to fail
      }

      const logRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const logs = await logRepo.find({ where: { productId: product.id } });

      expect(logs[0].status).toBe(NotificationStatus.FAILED);
      expect(logs[0].errorMessage).toContain('Email service unavailable');
    });
  });
});
