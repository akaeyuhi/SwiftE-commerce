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

describe('Analytics - Admin (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
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

  describe('Data Sync', () => {
    it('should sync product stats as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/analytics/sync/products/${product.id}`)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should prevent non-admin from syncing', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/analytics/sync/products/${product.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should sync store stats as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/analytics/sync/stores/${store.id}`)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe('System Health', () => {
    it('should get analytics health status', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/analytics/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/health');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('System Stats', () => {
    it('should get analytics system stats', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/analytics/stats')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Aggregator Metadata', () => {
    it('should list supported aggregators', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/aggregators')
        .expect(200);

      expect(response.body).toHaveProperty('aggregators');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.aggregators)).toBe(true);
    });

    it('should get aggregator schema', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/aggregators/storeStats/schema')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return error for invalid aggregator', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/aggregators/invalidName/schema');

      AssertionHelper.assertErrorResponse(response, 400, 'Unknown aggregator');
    });
  });

  describe('Admin Stats Controller', () => {
    it('should get store metrics summary', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/analytics/metrics/summary`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toHaveProperty('conversionRate');
    });

    it('should get product metrics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/analytics/products/${product.id}/metrics`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toHaveProperty('conversionRate');
    });

    it('should get top products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/analytics/products/top`)
        .query({ from: '2025-01-01', to: '2025-12-31', limit: '5' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
