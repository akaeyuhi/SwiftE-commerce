import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Products - CRUD (E2E)', () => {
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
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['products']);
  });

  describe('GET /stores/:storeId/products/byStore', () => {
    it('should list all products in a store', async () => {
      await seeder.seedProducts(store, 3);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/byStore`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('viewCount');
      expect(response.body[0]).toHaveProperty('totalSales');
    });

    it('should return empty array for store with no products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/byStore`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/stores/${store.id}/products/byStore`
      );

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate store UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/stores/invalid-uuid/products/byStore');

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /stores/:storeId/products', () => {
    const validProductData = {
      name: 'Test Product',
      description: 'A great test product',
    };

    it('should create a product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(validProductData)
        .expect(201);

      expect(response.body.name).toBe(validProductData.name);
      expect(response.body.description).toBe(validProductData.description);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should initialize stats to zero', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(validProductData)
        .expect(201);

      expect(response.body.viewCount).toBe(0);
      expect(response.body.totalSales).toBe(0);
      expect(response.body.likeCount).toBe(0);
      expect(response.body.reviewCount).toBe(0);
    });

    it('should require name', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send({ description: 'No name' });

      AssertionHelper.assertErrorResponse(response, 400, 'name');
    });

    it('should create product with categories', async () => {
      const categories = await seeder.seedCategories(2);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send({
          ...validProductData,
          categoryIds: categories.map((c) => c.id),
        })
        .expect(201);

      expect(response.body.categories).toBeDefined();
    });

    it('should require valid store UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/stores/invalid-uuid/products')
        .send(validProductData);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /stores/:storeId/products/:id/detailed', () => {
    it('should get detailed product info', async () => {
      const products = await seeder.seedProducts(store, 1);
      await seeder.seedVariants(products[0], 2);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${products[0].id}/detailed`)
        .expect(200);

      expect(response.body.id).toBe(products[0].id);
      expect(response.body).toHaveProperty('variants');
      expect(response.body.variants.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('photos');
      expect(response.body).toHaveProperty('categories');
    });

    it('should track view event', async () => {
      const products = await seeder.seedProducts(store, 1);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${products[0].id}/detailed`)
        .expect(200);

      // Verify analytics event was recorded
      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: {
          productId: products[0].id,
          eventType: 'view',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(
          `/stores/${store.id}/products/00000000-0000-0000-0000-000000000000/detailed`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('GET /stores/:storeId/products/:id/stats', () => {
    it('should return product statistics', async () => {
      const products = await seeder.seedProducts(store, 1);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${products[0].id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('viewCount');
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('likeCount');
      expect(response.body).toHaveProperty('reviewCount');
      expect(response.body).toHaveProperty('averageRating');
    });

    it('should alias quick-stats to stats', async () => {
      const products = await seeder.seedProducts(store, 1);

      const statsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${products[0].id}/stats`);

      const quickStatsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${products[0].id}/quick-stats`)
        .expect(200);

      expect(quickStatsResponse.body).toEqual(statsResponse.body);
    });
  });

  describe('DELETE /stores/:storeId/products/:id/soft', () => {
    it('should soft delete product', async () => {
      const products = await seeder.seedProducts(store, 1);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${store.id}/products/${products[0].id}/soft`)
        .expect(204);

      // Verify soft delete in database
      const productRepo = appHelper.getDataSource().getRepository('Product');
      const deletedProduct = await productRepo.findOne({
        where: { id: products[0].id },
        withDeleted: true,
      });

      expect(deletedProduct).toBeDefined();
      expect(deletedProduct?.deletedAt).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/00000000-0000-0000-0000-000000000000/soft`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('POST /stores/:storeId/products/:id/increment-view', () => {
    it('should increment view count', async () => {
      const products = await seeder.seedProducts(store, 1);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${products[0].id}/increment-view`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('View count incremented');
      expect(response.body.productId).toBe(products[0].id);
    });
  });

  describe('POST /stores/:storeId/products/:id/recalculate-stats', () => {
    it('should recalculate product statistics', async () => {
      const products = await seeder.seedProducts(store, 1);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${products[0].id}/recalculate-stats`
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('statistics recalculated');
      expect(response.body.productId).toBe(products[0].id);
    });
  });
});
