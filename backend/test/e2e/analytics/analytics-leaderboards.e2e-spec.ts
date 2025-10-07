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

describe('Analytics - Leaderboards (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let store: any;

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

    // Seed products with varying stats
    await seeder.seedProducts(store, 5);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /analytics/stores/:storeId/products/top/views', () => {
    it('should get top products by views', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top/views`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((product: any) => {
        expect(product).toHaveProperty('productId');
        expect(product).toHaveProperty('viewCount');
      });
    });

    it('should support custom limit', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top/views`)
        .query({ limit: 3 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('should default to 10 results', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top/views`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /analytics/stores/:storeId/products/top/conversion', () => {
    it('should get top products by conversion (cached)', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top/conversion`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /analytics/stores/:storeId/products/top', () => {
    it('should get top products with date range', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top`)
        .query({ from: '2025-01-01', to: '2025-12-31', limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /analytics/stores/top/revenue (Admin)', () => {
    it('should get top stores by revenue as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/analytics/stores/top/revenue')
        .query({ limit: 10 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/stores/top/revenue');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /analytics/stores/:storeId/top-performing-products', () => {
    it('should get top performing products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/top-performing-products`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /analytics/stores/top-performing (Admin)', () => {
    it('should get top performing stores as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/analytics/stores/top-performing')
        .query({ limit: 10, from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
