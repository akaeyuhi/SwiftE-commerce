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

describe('Analytics - Stats (E2E)', () => {
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

  describe('GET /analytics/products/:productId/quick-stats', () => {
    it('should get quick stats for product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/products/${product.id}/quick-stats`)
        .expect(200);

      expect(response.body).toHaveProperty('viewCount');
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('likeCount');
      expect(response.body).toHaveProperty('reviewCount');
      expect(response.body).toHaveProperty('averageRating');
    });

    it('should require store role', async () => {
      const regularUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/analytics/products/${product.id}/quick-stats`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate product UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/analytics/products/invalid-uuid/quick-stats');

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /analytics/stores/:storeId/quick-stats', () => {
    it('should get quick stats for store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/quick-stats`)
        .expect(200);

      expect(response.body).toHaveProperty('productCount');
      expect(response.body).toHaveProperty('followerCount');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('orderCount');
    });
  });

  describe('POST /analytics/products/batch-stats', () => {
    let products: any[];

    beforeEach(async () => {
      products = await seeder.seedProducts(store, 3);
    });

    it('should get stats for multiple products', async () => {
      const productIds = products.map((p) => p.id);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/products/batch-stats')
        .send({ productIds })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((stats: any) => {
        expect(stats).toHaveProperty('productId');
        expect(stats).toHaveProperty('viewCount');
        expect(stats).toHaveProperty('totalSales');
      });
    });

    it('should validate productIds array is provided', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/products/batch-stats')
        .send({});

      AssertionHelper.assertErrorResponse(response, 400, 'required');
    });

    it('should limit to 100 products', async () => {
      const productIds = Array(101).fill(
        '00000000-0000-0000-0000-000000000000'
      );

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/analytics/products/batch-stats')
        .send({ productIds });

      AssertionHelper.assertErrorResponse(response, 400, 'Maximum 100');
    });
  });

  describe('GET /analytics/stores/:storeId', () => {
    it('should get store analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support timeseries data', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}`)
        .query({
          from: '2025-01-01',
          to: '2025-12-31',
          includeTimeseries: true,
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /analytics/stores/:storeId/conversion', () => {
    it('should get store conversion metrics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/conversion`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toHaveProperty('conversionRate');
    });
  });

  describe('GET /analytics/stores/:storeId/products/:productId', () => {
    it('should get product analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/${product.id}`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /analytics/stores/:storeId/products/:productId/conversion', () => {
    it('should get product conversion metrics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/${product.id}/conversion`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toHaveProperty('conversionRate');
    });
  });

  describe('GET /analytics/stores/:storeId/products/:productId/rating', () => {
    it('should get product rating analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/${product.id}/rating`)
        .expect(200);

      expect(response.body).toHaveProperty('averageRating');
    });
  });

  describe('GET /analytics/stores/:storeId/ratings', () => {
    it('should get store ratings summary', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/ratings`)
        .query({ from: '2025-01-01', to: '2025-12-31' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
