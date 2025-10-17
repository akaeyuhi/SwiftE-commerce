import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Analytics - Advanced (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let adminUser: any;
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
    adminUser = await authHelper.createAdminUser();

    storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Funnel Analysis', () => {
    it('should get funnel analysis for store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/funnel`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support product-specific funnel', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/funnel`)
        .query({ productId: product.id, from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Revenue Trends', () => {
    it('should get revenue trends', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/revenue-trends`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Cohort Analysis', () => {
    it('should get cohort analysis', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/cohort-analysis`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('User Journey', () => {
    it('should get user journey analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/user-journey`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Comparisons', () => {
    it('should compare multiple stores', async () => {
      const store2 = await seeder.seedStore(storeOwner.user);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/stores/compare')
        .send({
          storeIds: [store.id, store2.id],
          from: '2025-01-01',
          to: '2025-12-31',
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should validate minimum 2 stores for comparison', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/stores/compare')
        .send({ storeIds: [store.id] });

      AssertionHelper.assertErrorResponse(response, 400, 'At least 2');
    });

    it('should limit to 10 stores', async () => {
      const storeIds = Array(11).fill(store.id);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/stores/compare')
        .send({ storeIds });

      AssertionHelper.assertErrorResponse(response, 400, 'Maximum 10');
    });

    it('should compare multiple products', async () => {
      const products = await seeder.seedProducts(store, 2);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/products/compare')
        .send({
          productIds: products.map((p) => p.id),
          from: '2025-01-01',
          to: '2025-12-31',
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should limit to 20 products', async () => {
      const productIds = Array(21).fill(product.id);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/products/compare')
        .send({ productIds });

      AssertionHelper.assertErrorResponse(response, 400, 'Maximum 20');
    });

    it('should compare time periods', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/period-comparison`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Underperforming Analysis', () => {
    it('should get underperforming products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/underperforming`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Generic Aggregation', () => {
    it('should run custom aggregation', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/aggregations')
        .send({
          aggregatorName: 'storeStats',
          options: {
            storeId: store.id,
            from: '2025-01-01',
            to: '2025-12-31',
          },
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should handle invalid aggregator name', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/aggregations')
        .send({
          aggregatorName: 'invalidAggregator',
          options: {},
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });
});
