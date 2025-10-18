import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Products - Ranking (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let storeOwner: any;
  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);

    // Seed products with different rankings
    const productRepo = appHelper.getDataSource().getRepository('Product');
    await productRepo.save([
      {
        name: 'High Views Product',
        storeId: store.id,
        viewCount: 1000,
        totalSales: 10,
        averageRating: 3.5,
        reviewCount: 20,
      },
      {
        name: 'High Sales Product',
        storeId: store.id,
        viewCount: 500,
        totalSales: 100,
        averageRating: 4.0,
        reviewCount: 50,
      },
      {
        name: 'High Rating Product',
        storeId: store.id,
        viewCount: 200,
        totalSales: 5,
        averageRating: 4.8,
        reviewCount: 10,
      },
    ]);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /stores/:storeId/products/top/views', () => {
    it('should return top products by views', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/views`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should be sorted by views descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].viewCount).toBeGreaterThanOrEqual(
          response.body[i].viewCount
        );
      }
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/views`)
        .query({ limit: 2 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should enforce max limit of 50', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/views`)
        .query({ limit: 100 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(50);
    });
  });

  describe('GET /stores/:storeId/products/top/sales', () => {
    it('should return top products by sales', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/sales`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should be sorted by sales descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].totalSales).toBeGreaterThanOrEqual(
          response.body[i].totalSales
        );
      }
    });
  });

  describe('GET /stores/:storeId/products/top/rated', () => {
    it('should return top rated products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/rated`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should be sorted by rating descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].averageRating).toBeGreaterThanOrEqual(
          response.body[i].averageRating
        );
      }
    });
  });

  describe('GET /stores/:storeId/products/top/conversion', () => {
    it('should return top products by conversion rate', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/top/conversion`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should have conversion rate calculated
      response.body.forEach((product: any) => {
        expect(product).toHaveProperty('conversionRate');
        expect(typeof product.conversionRate).toBe('number');
      });
    });
  });

  describe('GET /stores/:storeId/products/trending', () => {
    it('should return trending products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/trending`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect days parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/trending`)
        .query({ days: 30 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/trending`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty store', async () => {
      const emptyStore = await seeder.seedStore(storeOwner.user);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${emptyStore.id}/products/top/views`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should require valid store UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/stores/invalid-uuid/products/top/views');

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/stores/${store.id}/products/top/views`);

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });
});
