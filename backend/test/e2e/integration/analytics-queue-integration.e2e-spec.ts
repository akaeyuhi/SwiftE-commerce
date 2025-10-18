import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from 'test/e2e/helpers/auth.helper';
import { SeederHelper } from 'test/e2e/helpers/seeder.helper';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Analytics - Queue Integration (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let analyticsQueueService: AnalyticsQueueService;

  let customer: any;
  let store: any;
  let product: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        AnalyticsModule,
        StoreModule,
        ProductsModule,
        AuthModule,
        UserModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    analyticsQueueService = app.get(AnalyticsQueueService);

    customer = await authHelper.createAuthenticatedUser();
    const storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('End-to-End User Journey', () => {
    it('should track complete purchase funnel', async () => {
      // 1. View product
      const viewJobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );

      // 2. Like product
      const likeJobId = await analyticsQueueService.recordLike(
        store.id,
        product.id,
        customer.user.id
      );

      // 3. Add to cart
      const cartJobId = await analyticsQueueService.recordAddToCart(
        store.id,
        product.id,
        customer.user.id,
        2
      );

      // 4. Purchase
      const purchaseJobId = await analyticsQueueService.recordPurchase(
        store.id,
        product.id,
        customer.user.id,
        59.98
      );

      expect(viewJobId).toBeDefined();
      expect(likeJobId).toBeDefined();
      expect(cartJobId).toBeDefined();
      expect(purchaseJobId).toBeDefined();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify events were created
      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: { productId: product.id, userId: customer.user.id },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle abandoned cart scenario', async () => {
      await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );
      await analyticsQueueService.recordAddToCart(
        store.id,
        product.id,
        customer.user.id,
        1
      );
      // No purchase = abandoned cart

      await new Promise((resolve) => setTimeout(resolve, 500));

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: { productId: product.id, userId: customer.user.id },
      });

      const hasView = events.some(
        (e) => e.eventType === AnalyticsEventType.VIEW
      );
      const hasAddToCart = events.some(
        (e) => e.eventType === AnalyticsEventType.ADD_TO_CART
      );
      const hasPurchase = events.some(
        (e) => e.eventType === AnalyticsEventType.PURCHASE
      );

      expect(hasView).toBe(true);
      expect(hasAddToCart).toBe(true);
      expect(hasPurchase).toBe(false);
    });
  });

  describe('Multi-Product Analytics', () => {
    it('should track events across multiple products', async () => {
      const products = await seeder.seedProducts(store, 3);

      const jobIds = await Promise.all(
        products.map((p) =>
          analyticsQueueService.recordView(store.id, p.id, customer.user.id)
        )
      );

      expect(jobIds.length).toBe(3);
      jobIds.forEach((jobId) => expect(jobId).toBeDefined());
    });

    it('should track batch events for multiple products', async () => {
      const products = await seeder.seedProducts(store, 3);

      const events = products.map((p) => ({
        storeId: store.id,
        productId: p.id,
        userId: customer.user.id,
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product' as const,
      }));

      const jobId = await analyticsQueueService.addBatch(events);

      expect(jobId).toBeDefined();
    });
  });

  describe('Campaign Tracking', () => {
    it('should track campaign attribution', async () => {
      const jobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id,
        {
          campaign: 'summer-sale-2025',
          source: 'email',
          medium: 'newsletter',
        }
      );

      expect(jobId).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: { productId: product.id, userId: customer.user.id },
      });

      const campaignEvent = events.find(
        (e) => e.meta?.campaign === 'summer-sale-2025'
      );

      expect(campaignEvent).toBeDefined();
    });
  });

  describe('Anonymous vs Authenticated Tracking', () => {
    it('should track anonymous user events', async () => {
      const jobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        undefined, // Anonymous
        { sessionId: 'anon-session-123' }
      );

      expect(jobId).toBeDefined();
    });

    it('should track authenticated user events', async () => {
      const jobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );

      expect(jobId).toBeDefined();
    });
  });

  describe('Real-time vs Batch Processing', () => {
    it('should process single events in real-time', async () => {
      const startTime = Date.now();

      const jobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );

      const queueTime = Date.now() - startTime;

      expect(jobId).toBeDefined();
      expect(queueTime).toBeLessThan(100); // Should queue quickly
    });

    it('should handle batch processing efficiently', async () => {
      const events = Array(50)
        .fill(null)
        .map(() => ({
          storeId: store.id,
          productId: product.id,
          userId: customer.user.id,
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product' as const,
        }));

      const startTime = Date.now();
      const jobId = await analyticsQueueService.addBatch(events);
      const batchTime = Date.now() - startTime;

      expect(jobId).toBeDefined();
      expect(batchTime).toBeLessThan(200); // Should batch efficiently
    });
  });

  describe('Queue Monitoring', () => {
    it('should monitor queue statistics', async () => {
      // Add various jobs
      await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );
      await analyticsQueueService.scheduleDailyAggregation();
      await analyticsQueueService.scheduleCleanup(90);

      const stats = await analyticsQueueService.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats).toHaveProperty('total');
      expect(stats.waiting).toBeGreaterThanOrEqual(0);
    });

    it('should track queue growth over time', async () => {
      const statsBefore = await analyticsQueueService.getStats();

      // Add more jobs
      await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );
      await analyticsQueueService.recordLike(
        store.id,
        product.id,
        customer.user.id
      );
      await analyticsQueueService.recordAddToCart(
        store.id,
        product.id,
        customer.user.id,
        1
      );

      const statsAfter = await analyticsQueueService.getStats();

      // Total should increase (or stay same if jobs processed quickly)
      expect(statsAfter.total).toBeGreaterThanOrEqual(statsBefore.total);
    });
  });

  describe('Event Lifecycle', () => {
    it('should track event from queue to database', async () => {
      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');

      const eventsBefore = await eventRepo.count();

      const jobId = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );

      expect(jobId).toBeDefined();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const eventsAfter = await eventRepo.count();

      expect(eventsAfter).toBeGreaterThan(eventsBefore);
    });

    it('should preserve event metadata through processing', async () => {
      const metadata = {
        source: 'mobile-app',
        version: '2.1.0',
        campaign: 'black-friday',
      };

      await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id,
        metadata
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: { productId: product.id, userId: customer.user.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      expect(events[0]).toBeDefined();
      expect(events[0].meta).toMatchObject(metadata);
    });
  });

  describe('Error Recovery', () => {
    it('should handle queue operations gracefully', async () => {
      // These operations should not throw
      await expect(
        analyticsQueueService.recordView(store.id, product.id, customer.user.id)
      ).resolves.toBeDefined();

      await expect(analyticsQueueService.getStats()).resolves.toBeDefined();

      await expect(
        analyticsQueueService.retryFailed()
      ).resolves.toBeGreaterThanOrEqual(0);
    });

    it('should continue processing after errors', async () => {
      // Queue some valid events
      const jobId1 = await analyticsQueueService.recordView(
        store.id,
        product.id,
        customer.user.id
      );

      // Even if one fails, others should process
      const jobId2 = await analyticsQueueService.recordLike(
        store.id,
        product.id,
        customer.user.id
      );

      expect(jobId1).toBeDefined();
      expect(jobId2).toBeDefined();
    });
  });
});
