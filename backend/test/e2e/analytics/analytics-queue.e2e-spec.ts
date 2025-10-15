// import { INestApplication } from '@nestjs/common';
// import { TestAppHelper } from '../helpers/test-app.helper';
// import { AuthHelper } from '../helpers/auth.helper';
// import { SeederHelper } from '../helpers/seeder.helper';
// import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
// import { StoreModule } from 'src/modules/store/store.module';
// import { ProductsModule } from 'src/modules/products/products.module';
// import { UserModule } from 'src/modules/user/user.module';
// import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
// import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
// import { AuthModule } from 'src/modules/auth/auth.module';
//
// describe('Analytics - Queue (E2E)', () => {
//   let appHelper: TestAppHelper;
//   let app: INestApplication;
//   let authHelper: AuthHelper;
//   let seeder: SeederHelper;
//   let analyticsQueueService: AnalyticsQueueService;
//
//   let customer: any;
//   let store: any;
//   let product: any;
//
//   beforeAll(async () => {
//     appHelper = new TestAppHelper();
//     app = await appHelper.initialize({
//       imports: [
//         AnalyticsModule,
//         StoreModule,
//         ProductsModule,
//         AuthModule,
//         UserModule,
//       ],
//     });
//     authHelper = new AuthHelper(app, appHelper.getDataSource());
//     seeder = new SeederHelper(appHelper.getDataSource());
//
//     analyticsQueueService = app.get(AnalyticsQueueService);
//
//     customer = await authHelper.createAuthenticatedUser();
//     const storeOwner = await authHelper.createAuthenticatedUser();
//     store = await seeder.seedStore(storeOwner.user);
//     const products = await seeder.seedProducts(store, 1);
//     product = products[0];
//   });
//
//   afterAll(async () => {
//     await appHelper.cleanup();
//   });
//
//   describe('Single Event Recording', () => {
//     it('should queue view event', async () => {
//       const jobId = await analyticsQueueService.recordView(
//         store.id,
//         product.id,
//         customer.user.id
//       );
//
//       expect(jobId).toBeDefined();
//       expect(typeof jobId).toBe('string');
//     });
//
//     it('should queue like event', async () => {
//       const jobId = await analyticsQueueService.recordLike(
//         store.id,
//         product.id,
//         customer.user.id
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should queue add to cart event', async () => {
//       const jobId = await analyticsQueueService.recordAddToCart(
//         store.id,
//         product.id,
//         customer.user.id,
//         2
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should queue purchase event', async () => {
//       const jobId = await analyticsQueueService.recordPurchase(
//         store.id,
//         product.id,
//         customer.user.id,
//         99.99
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should queue click event', async () => {
//       const jobId = await analyticsQueueService.recordClick(
//         store.id,
//         product.id,
//         customer.user.id
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should queue generic event with options', async () => {
//       const jobId = await analyticsQueueService.addEvent(
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product',
//         },
//         { priority: 10 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should support event metadata', async () => {
//       const jobId = await analyticsQueueService.recordView(
//         store.id,
//         product.id,
//         customer.user.id,
//         { source: 'homepage', campaign: 'summer-sale' }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should handle store-level events', async () => {
//       const jobId = await analyticsQueueService.recordView(
//         store.id,
//         undefined, // No product
//         customer.user.id
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should handle anonymous events', async () => {
//       const jobId = await analyticsQueueService.recordView(
//         store.id,
//         product.id,
//         undefined // No user
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should handle optional parameters', async () => {
//       const jobId = await analyticsQueueService.recordView(store.id);
//
//       expect(jobId).toBeDefined();
//     });
//   });
//
//   describe('Batch Event Recording', () => {
//     it('should queue batch events', async () => {
//       const events = [
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product' as const,
//         },
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.ADD_TO_CART,
//           invokedOn: 'product' as const,
//           value: 2,
//         },
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.PURCHASE,
//           invokedOn: 'product' as const,
//           value: 59.99,
//         },
//       ];
//
//       const jobId = await analyticsQueueService.addBatch(events);
//
//       expect(jobId).toBeDefined();
//       expect(jobId).toContain('batch_');
//     });
//
//     it('should reject empty batch', async () => {
//       await expect(analyticsQueueService.addBatch([])).rejects.toThrow(
//         'Cannot add empty batch'
//       );
//     });
//
//     it('should handle large batches', async () => {
//       const events = Array(100)
//         .fill(null)
//         .map(() => ({
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product' as const,
//         }));
//
//       const jobId = await analyticsQueueService.addBatch(events);
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should support batch with options', async () => {
//       const events = [
//         {
//           storeId: store.id,
//           productId: product.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product' as const,
//         },
//       ];
//
//       const jobId = await analyticsQueueService.addBatch(events, {
//         priority: 5,
//       });
//
//       expect(jobId).toBeDefined();
//       expect(jobId).toMatch(/^batch_\d+_[a-z0-9]+$/);
//     });
//   });
//
//   describe('Scheduled Jobs', () => {
//     it('should schedule daily aggregation', async () => {
//       const jobId = await analyticsQueueService.scheduleDailyAggregation();
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule aggregation for specific date', async () => {
//       const date = new Date('2025-10-01');
//       const jobId = await analyticsQueueService.scheduleDailyAggregation(date);
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule aggregation with options', async () => {
//       const jobId = await analyticsQueueService.scheduleDailyAggregation(
//         new Date(),
//         { priority: 10 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule cleanup job', async () => {
//       const jobId = await analyticsQueueService.scheduleCleanup(90);
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule cleanup with custom retention', async () => {
//       const jobId = await analyticsQueueService.scheduleCleanup(30);
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule cleanup with options', async () => {
//       const jobId = await analyticsQueueService.scheduleCleanup(90, {
//         delay: 5000,
//       });
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule metrics processing', async () => {
//       const jobId = await analyticsQueueService.scheduleMetricsProcessing();
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule metrics processing with options', async () => {
//       const jobId = await analyticsQueueService.scheduleMetricsProcessing({
//         priority: 8,
//       });
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule report generation', async () => {
//       const jobId = await analyticsQueueService.scheduleReportGeneration(
//         'monthly',
//         { storeId: store.id, month: '2025-10' }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should schedule report with options', async () => {
//       const jobId = await analyticsQueueService.scheduleReportGeneration(
//         'weekly',
//         { storeId: store.id },
//         { priority: 7 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//   });
//
//   describe('Queue Options via addEvent', () => {
//     it('should support delayed jobs', async () => {
//       const jobId = await analyticsQueueService.addEvent(
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product',
//         },
//         { delay: 5000 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should support priority jobs', async () => {
//       const jobId = await analyticsQueueService.addEvent(
//         {
//           storeId: store.id,
//           productId: product.id,
//           userId: customer.user.id,
//           eventType: AnalyticsEventType.PURCHASE,
//           invokedOn: 'product',
//           value: 99.99,
//         },
//         { priority: 10 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should support custom retry settings', async () => {
//       const jobId = await analyticsQueueService.addEvent(
//         {
//           storeId: store.id,
//           productId: product.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product',
//         },
//         { maxAttempts: 5, backoffDelay: 3000 }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should support custom job IDs', async () => {
//       const customJobId = `custom-${Date.now()}`;
//
//       const jobId = await analyticsQueueService.addEvent(
//         {
//           storeId: store.id,
//           productId: product.id,
//           eventType: AnalyticsEventType.VIEW,
//           invokedOn: 'product',
//         },
//         { jobId: customJobId }
//       );
//
//       expect(jobId).toBe(customJobId);
//     });
//   });
//
//   describe('Queue Statistics', () => {
//     beforeEach(async () => {
//       await analyticsQueueService.recordView(
//         store.id,
//         product.id,
//         customer.user.id
//       );
//       await analyticsQueueService.recordLike(
//         store.id,
//         product.id,
//         customer.user.id
//       );
//     });
//
//     it('should get queue statistics', async () => {
//       const stats = await analyticsQueueService.getStats();
//
//       expect(stats).toHaveProperty('waiting');
//       expect(stats).toHaveProperty('active');
//       expect(stats).toHaveProperty('completed');
//       expect(stats).toHaveProperty('failed');
//       expect(stats).toHaveProperty('delayed');
//       expect(stats).toHaveProperty('total');
//     });
//
//     it('should track job counts', async () => {
//       const stats = await analyticsQueueService.getStats();
//
//       expect(typeof stats.waiting).toBe('number');
//       expect(typeof stats.active).toBe('number');
//       expect(typeof stats.completed).toBe('number');
//       expect(typeof stats.failed).toBe('number');
//       expect(typeof stats.total).toBe('number');
//     });
//   });
//
//   describe('Queue Management', () => {
//     it('should retry failed jobs', async () => {
//       const retriedCount = await analyticsQueueService.retryFailed();
//
//       expect(typeof retriedCount).toBe('number');
//       expect(retriedCount).toBeGreaterThanOrEqual(0);
//     });
//
//     it('should retry specific job type', async () => {
//       const retriedCount =
//         await analyticsQueueService.retryFailed('record_single');
//
//       expect(typeof retriedCount).toBe('number');
//     });
//
//     it('should purge old completed jobs', async () => {
//       const purgedCount = await analyticsQueueService.purgeCompleted(24);
//
//       expect(typeof purgedCount).toBe('number');
//       expect(purgedCount).toBeGreaterThanOrEqual(0);
//     });
//   });
//
//   describe('Recurring Jobs', () => {
//     it('should schedule recurring job', async () => {
//       const jobId = await analyticsQueueService.scheduleRecurring(
//         'aggregate_daily',
//         '0 2 * * *',
//         {
//           events: [],
//           metadata: { type: 'daily_test' },
//         }
//       );
//
//       expect(jobId).toBeDefined();
//     });
//
//     it('should setup all recurring jobs', async () => {
//       await expect(
//         analyticsQueueService.setupRecurringJobs()
//       ).resolves.not.toThrow();
//     });
//   });
//
//   describe('Event Types Coverage', () => {
//     it('should support all event recording methods', async () => {
//       const methods = [
//         () =>
//           analyticsQueueService.recordView(
//             store.id,
//             product.id,
//             customer.user.id
//           ),
//         () =>
//           analyticsQueueService.recordLike(
//             store.id,
//             product.id,
//             customer.user.id
//           ),
//         () =>
//           analyticsQueueService.recordAddToCart(
//             store.id,
//             product.id,
//             customer.user.id,
//             2
//           ),
//         () =>
//           analyticsQueueService.recordPurchase(
//             store.id,
//             product.id,
//             customer.user.id,
//             99.99
//           ),
//         () =>
//           analyticsQueueService.recordClick(
//             store.id,
//             product.id,
//             customer.user.id
//           ),
//       ];
//
//       for (const method of methods) {
//         const jobId = await method();
//         expect(jobId).toBeDefined();
//       }
//     });
//
//     it('should support custom event types via addEvent', async () => {
//       const jobId = await analyticsQueueService.addEvent({
//         storeId: store.id,
//         productId: product.id,
//         eventType: AnalyticsEventType.CHECKOUT,
//         invokedOn: 'store',
//       });
//
//       expect(jobId).toBeDefined();
//     });
//   });
//
//   describe('Performance', () => {
//     it('should handle concurrent event queuing', async () => {
//       const promises = Array(10)
//         .fill(null)
//         .map(() =>
//           analyticsQueueService.recordView(
//             store.id,
//             product.id,
//             customer.user.id
//           )
//         );
//
//       const jobIds = await Promise.all(promises);
//
//       expect(jobIds.length).toBe(10);
//       jobIds.forEach((jobId) => {
//         expect(jobId).toBeDefined();
//       });
//     });
//
//     it('should handle rapid batch submissions', async () => {
//       const batches = Array(5)
//         .fill(null)
//         .map(() => [
//           {
//             storeId: store.id,
//             productId: product.id,
//             eventType: AnalyticsEventType.VIEW,
//             invokedOn: 'product' as const,
//           },
//         ]);
//
//       const promises = batches.map((batch) =>
//         analyticsQueueService.addBatch(batch)
//       );
//
//       const jobIds = await Promise.all(promises);
//
//       expect(jobIds.length).toBe(5);
//     });
//   });
//
//   describe('Queue Cleanup', () => {
//     it('should close queue gracefully', async () => {
//       await expect(analyticsQueueService.close()).resolves.not.toThrow();
//     });
//   });
// });
