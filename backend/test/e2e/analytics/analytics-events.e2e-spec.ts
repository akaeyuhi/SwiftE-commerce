import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Analytics - Events (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

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

    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];

    await seeder.assignStoreModerator(storeModerator.user.id, store.id);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['analytics_events']);
  });

  describe('POST /analytics/stores/:storeId/events', () => {
    const validEventData = {
      eventType: AnalyticsEventType.VIEW,
      invokedOn: 'product',
      productId: null, // Will be set in test
      userId: null, // Will be set in test
    };

    beforeEach(() => {
      validEventData.productId = product.id;
      validEventData.userId = regularUser.user.id;
    });

    it('should record a view event', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send(validEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('tracked successfully');
      expect(response.body.event.eventType).toBe(AnalyticsEventType.VIEW);
    });

    it('should record an add to cart event', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          ...validEventData,
          eventType: AnalyticsEventType.ADD_TO_CART,
          value: 2,
        })
        .expect(201);

      expect(response.body.event.eventType).toBe(
        AnalyticsEventType.ADD_TO_CART
      );
    });

    it('should record a checkout event', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          ...validEventData,
          eventType: AnalyticsEventType.CHECKOUT,
          value: 99.99,
        })
        .expect(201);

      expect(response.body.event.eventType).toBe(AnalyticsEventType.CHECKOUT);
    });

    it('should record a like event', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          ...validEventData,
          eventType: AnalyticsEventType.LIKE,
        })
        .expect(201);

      expect(response.body.event.eventType).toBe(AnalyticsEventType.LIKE);
    });

    it('should allow store admin to record events', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send(validEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should prevent regular user from recording events', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send(validEventData);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/analytics/stores/${store.id}/events`)
        .send(validEventData);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate event type', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          ...validEventData,
          eventType: 'INVALID_TYPE',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should ensure storeId matches route parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          ...validEventData,
          storeId: '00000000-0000-0000-0000-000000000000',
        });

      AssertionHelper.assertErrorResponse(response, 400, 'must match');
    });

    it('should set storeId from route if not provided', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send(validEventData)
        .expect(201);

      expect(response.body.event.storeId).toBe(store.id);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post('/analytics/stores/invalid-uuid/events')
        .send(validEventData);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /analytics/stores/:storeId/events/batch', () => {
    it('should record multiple events', async () => {
      const events = [
        {
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
        },
        {
          eventType: AnalyticsEventType.ADD_TO_CART,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
          value: 2,
        },
        {
          eventType: AnalyticsEventType.CHECKOUT,
          productId: product.id,
          userId: regularUser.user.id,
          invokedOn: 'product',
          value: 59.99,
        },
      ];

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events/batch`)
        .send({ events })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.processed).toBe(3);
      expect(response.body.failed).toBe(0);
    });

    it('should validate all events belong to store', async () => {
      const events = [
        {
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
          storeId: store.id,
        },
        {
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
          storeId: '00000000-0000-0000-0000-000000000000', // Different store
        },
      ];

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events/batch`)
        .send({ events });

      AssertionHelper.assertErrorResponse(
        response,
        400,
        'belong to the specified store'
      );
    });

    // it('should handle partial failures gracefully', async () => {
    //   const events = [
    //     {
    //       eventType: AnalyticsEventType.VIEW,
    //       productId: product.id,
    //       invokedOn: 'product',
    //       userId: regularUser.user.id,
    //     },
    //     {
    //       eventType: 'INVALID_TYPE', // Invalid event
    //       invokedOn: 'product',
    //       productId: product.id,
    //       userId: regularUser.user.id,
    //     },
    //   ];
    //
    //   const response = await authHelper
    //     .authenticatedRequest(storeModerator.accessToken)
    //     .post(`/analytics/stores/${store.id}/events/batch`)
    //     .send({ events })
    //     .expect(201);
    //
    //   expect(response.body.processed).toBeGreaterThan(0);
    //   expect(response.body.failed).toBeGreaterThan(0);
    //   expect(response.body.errors).toBeDefined();
    // });

    it('should set storeId for all events from route', async () => {
      const events = [
        {
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
        },
      ];

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events/batch`)
        .send({ events })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /stores/:storeId/analytics/events (Public API)', () => {
    it('should record event via public API', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${store.id}/analytics/events`)
        .send({
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should not require authentication for public API', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${store.id}/analytics/events`)
        .send({
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('Event Persistence', () => {
    it('should persist events to database', async () => {
      await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          eventType: AnalyticsEventType.VIEW,
          productId: product.id,
          invokedOn: 'product',
          userId: regularUser.user.id,
        })
        .expect(201);

      await new Promise((resolve) => setInterval(resolve, 100));

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({ where: { productId: product.id } });

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe(AnalyticsEventType.VIEW);
      expect(events[0].storeId).toBe(store.id);
    });

    it('should track event metadata', async () => {
      await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/analytics/stores/${store.id}/events`)
        .send({
          eventType: AnalyticsEventType.ADD_TO_CART,
          productId: product.id,
          userId: regularUser.user.id,
          value: 5,
          invokedOn: 'product',
          meta: { color: 'blue', size: 'M' },
        })
        .expect(201);

      await new Promise((resolve) => setInterval(resolve, 100));

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');

      const events = await eventRepo.find({ where: { productId: product.id } });

      expect(events[0].value).toBe(5);
      expect(events[0].metadata).toEqual({ color: 'blue', size: 'M' });
    });
  });
});
