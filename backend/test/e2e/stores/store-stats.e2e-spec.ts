import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Store - Statistics (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let adminUser: any;
  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, AuthModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();

    // Create stores with different stats
    store = await seeder.seedStore(adminUser.user, {
      totalRevenue: 10000,
      productCount: 50,
      followerCount: 500,
      orderCount: 100,
    });
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /stores/:id/stats', () => {
    it('should return store statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('id', store.id);
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('productCount');
      expect(response.body).toHaveProperty('followerCount');
      expect(response.body).toHaveProperty('orderCount');
      AssertionHelper.assertStatsDto(response.body);
    });

    it('should return 404 for non-existent store', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/00000000-0000-0000-0000-000000000000/stats');

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('GET /stores/:id/quick-stats', () => {
    it('should return same stats as /stats endpoint', async () => {
      const statsResponse = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/stats`);

      const quickStatsResponse = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/quick-stats`)
        .expect(200);

      expect(quickStatsResponse.body).toEqual(statsResponse.body);
    });
  });

  describe('GET /stores/top/revenue', () => {
    it('should return top stores by revenue', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/top/revenue')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify sorted by revenue descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].totalRevenue).toBeGreaterThanOrEqual(
          response.body[i].totalRevenue
        );
      }
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/top/revenue')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /stores/top/products', () => {
    it('should return top stores by product count', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/top/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify sorted by product count descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].productCount).toBeGreaterThanOrEqual(
          response.body[i].productCount
        );
      }
    });
  });

  describe('GET /stores/top/followers', () => {
    it('should return top stores by followers', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/top/followers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify sorted by followers descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].followerCount).toBeGreaterThanOrEqual(
          response.body[i].followerCount
        );
      }
    });
  });

  describe('POST /stores/:id/recalculate-stats', () => {
    it('should recalculate store statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/recalculate-stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('recalculated');
      expect(response.body.storeId).toBe(store.id);
    });

    it('should require admin role', async () => {
      const regularUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/recalculate-stats`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('POST /stores/recalculate-all-stats', () => {
    it('should recalculate all store statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/stores/recalculate-all-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        'All store statistics recalculated'
      );
    });

    it('should require admin role', async () => {
      const regularUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/stores/recalculate-all-stats');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:id/health', () => {
    it('should check store data health', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/health`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should require admin role', async () => {
      const regularUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/health`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });
});
