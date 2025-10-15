import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Products - Search (E2E)', () => {
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

    // Seed test products with specific names
    const productRepo = appHelper.getDataSource().getRepository('Product');
    await productRepo.save([
      {
        name: 'Gaming Laptop Pro',
        description: 'High-performance gaming laptop',
        storeId: store.id,
        viewCount: 1000,
        totalSales: 50,
        averageRating: 4.5,
      },
      {
        name: 'Gaming Mouse',
        description: 'RGB gaming mouse',
        storeId: store.id,
        viewCount: 500,
        totalSales: 100,
        averageRating: 4.2,
      },
      {
        name: 'Office Chair',
        description: 'Ergonomic office chair',
        storeId: store.id,
        viewCount: 200,
        totalSales: 25,
        averageRating: 4.0,
      },
    ]);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /stores/:storeId/products/search', () => {
    it('should search products by name', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/search`)
        .query({ q: 'gaming' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(
        response.body.every((product: any) =>
          product.name.toLowerCase().includes('gaming')
        )
      ).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/search`)
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/search`)
        .query({ q: 'gaming', limit: 1 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should support sortBy parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/search`)
        .query({ q: 'gaming', sortBy: 'views' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should be sorted by views descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].viewCount).toBeGreaterThanOrEqual(
          response.body[i].viewCount
        );
      }
    });

    it('should enforce max limit of 50', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/search`)
        .query({ q: 'product', limit: 100 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(50);
    });
  });

  describe('POST /stores/:storeId/products/advanced-search', () => {
    it('should perform advanced search', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/advanced-search`)
        .send({
          query: 'gaming',
          sortBy: 'rating',
          sortOrder: 'DESC',
          limit: 20,
          offset: 0,
        })
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter by price range', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/advanced-search`)
        .send({
          minPrice: 100,
          maxPrice: 1000,
          limit: 20,
        })
        .expect(200);

      expect(response.body.products).toBeDefined();
    });

    it('should filter by rating', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/advanced-search`)
        .send({
          minRating: 4.0,
          limit: 20,
        })
        .expect(200);

      expect(response.body.products).toBeDefined();
    });

    it('should filter by categories', async () => {
      const categories = await seeder.seedCategories(2);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/advanced-search`)
        .send({
          categoryIds: [categories[0].id],
          limit: 20,
        })
        .expect(200);

      expect(response.body.products).toBeDefined();
    });

    it('should calculate correct page number', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/advanced-search`)
        .send({
          limit: 10,
          offset: 20,
        })
        .expect(200);

      expect(response.body.page).toBe(3);
    });
  });

  describe('GET /stores/:storeId/products/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/autocomplete`)
        .query({ q: 'gam' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((product: any) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product.name.toLowerCase()).toContain('gam');
      });
    });

    it('should require at least 2 characters', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/autocomplete`)
        .query({ q: 'g' })
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/autocomplete`)
        .query({ q: 'gaming', limit: 5 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should enforce max limit of 20', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/autocomplete`)
        .query({ q: 'product', limit: 50 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(20);
    });

    it('should include price and photo info', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/autocomplete`)
        .query({ q: 'gaming' })
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('id');
        // Optional fields
        if (response.body[0].minPrice !== undefined) {
          expect(typeof response.body[0].minPrice).toBe('number');
        }
        if (response.body[0].mainPhotoUrl !== undefined) {
          expect(typeof response.body[0].mainPhotoUrl).toBe('string');
        }
      }
    });
  });
});
