import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AuthModule } from 'src/modules/auth/auth.module';
import { EmailModule } from 'src/modules/email/email.module';

describe('Email - Queue (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let emailQueueService: EmailQueueService;

  let storeOwner: any;
  let customer: any;
  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [EmailModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    emailQueueService = app.get(EmailQueueService);

    storeOwner = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Email Queue Operations', () => {
    it('should queue user confirmation email', async () => {
      const jobId = await emailQueueService.sendUserConfirmation(
        customer.user.email,
        customer.user.firstName,
        'https://example.com/confirm/123',
        store.name
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should queue welcome email', async () => {
      const jobId = await emailQueueService.sendWelcomeEmail(
        customer.user.email,
        customer.user.firstName,
        `https://example.com/stores/${store.id}`,
        store.name
      );

      expect(jobId).toBeDefined();
    });

    it('should queue stock alert', async () => {
      const jobId = await emailQueueService.sendStockAlert(
        customer.user.email,
        customer.user.firstName,
        {
          name: 'Product',
          price: '$29.99',
          stockQuantity: 10,
          url: 'https://example.com/products/123',
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue low stock warning', async () => {
      const jobId = await emailQueueService.sendLowStockWarning(
        storeOwner.user.email,
        storeOwner.user.firstName,
        store.name,
        {
          name: 'Product',
          sku: 'SKU-123',
          category: 'Category',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 2,
        },
        'https://example.com/inventory'
      );

      expect(jobId).toBeDefined();
    });

    it('should queue password reset email', async () => {
      const jobId = await emailQueueService.sendPasswordReset(
        customer.user.email,
        customer.user.firstName,
        'https://example.com/reset/abc123',
        30
      );

      expect(jobId).toBeDefined();
    });

    it('should queue role confirmation email', async () => {
      const jobId = await emailQueueService.sendRoleConfirmation(
        customer.user.email,
        customer.user.firstName,
        AdminRoles.ADMIN,
        'https://example.com/confirm-role/123',
        { storeName: store.name }
      );

      expect(jobId).toBeDefined();
    });
  });

  describe('Order Email Queuing', () => {
    it('should queue order confirmation', async () => {
      const jobId = await emailQueueService.sendOrderConfirmation(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: 'order-123',
          orderNumber: 'ORD-001',
          totalAmount: 99.99,
          currency: 'USD',
          items: [
            { name: 'Product 1', quantity: 2, price: 29.99 },
            { name: 'Product 2', quantity: 1, price: 39.99 },
          ],
          orderUrl: 'https://example.com/orders/123',
          storeName: store.name,
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue order shipped', async () => {
      const jobId = await emailQueueService.sendOrderShipped(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: 'order-123',
          orderNumber: 'ORD-001',
          trackingNumber: '1Z999AA10123456784',
          trackingUrl: 'https://ups.com/track/1Z999AA10123456784',
          estimatedDeliveryDate: '2025-10-15',
          shippingMethod: 'UPS Ground',
          shippingAddress: '123 Main St, NYC',
          shippedDate: '2025-10-08',
          storeName: store.name,
          items: [{ name: 'Product 1', quantity: 2 }],
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue order delivered', async () => {
      const jobId = await emailQueueService.sendOrderDelivered(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: 'order-123',
          orderNumber: 'ORD-001',
          deliveredDate: '2025-10-15',
          shippingAddress: '123 Main St, NYC',
          reviewUrl: 'https://example.com/orders/123/review',
          supportUrl: 'https://example.com/support',
          storeName: store.name,
          items: [{ name: 'Product 1', quantity: 2 }],
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue order cancelled', async () => {
      const jobId = await emailQueueService.sendOrderCancelled(
        customer.user.email,
        customer.user.firstName,
        {
          orderId: 'order-123',
          orderNumber: 'ORD-001',
          cancelledDate: '2025-10-08',
          cancellationReason: 'Customer requested',
          refundAmount: 99.99,
          refundMethod: 'Original payment method',
          storeName: store.name,
          items: [
            {
              productName: 'Product 1',
              sku: 'SKU-1',
              quantity: 2,
              unitPrice: 29.99,
              lineTotal: 59.98,
            },
          ],
        }
      );

      expect(jobId).toBeDefined();
    });
  });

  describe('News Email Queuing', () => {
    it('should queue news notification', async () => {
      const jobId = await emailQueueService.sendNewsNotification(
        customer.user.email,
        customer.user.firstName,
        {
          newsId: 'news-123',
          title: 'Store Update',
          excerpt: 'We have exciting news...',
          content: 'Full content here...',
          authorName: storeOwner.user.firstName,
          publishedAt: new Date().toISOString(),
          newsUrl: 'https://example.com/news/123',
          storeName: store.name,
          unsubscribeUrl: 'https://example.com/unsubscribe',
        }
      );

      expect(jobId).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    it('should get queue stats', async () => {
      const stats = await emailQueueService.getStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });

    it('should schedule delayed email', async () => {
      const jobId = await emailQueueService.sendWelcomeEmail(
        customer.user.email,
        customer.user.firstName,
        'https://example.com',
        store.name,
        { delay: 5000 } // 5 seconds delay
      );

      expect(jobId).toBeDefined();
    });

    it('should support priority emails', async () => {
      const jobId = await emailQueueService.sendPasswordReset(
        customer.user.email,
        customer.user.firstName,
        'https://example.com/reset/123',
        30,
        { priority: 1 } // High priority
      );

      expect(jobId).toBeDefined();
    });
  });
});
