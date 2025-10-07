import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CategoriesModule } from 'src/modules/store/categories/categories.module';

/**
 * Search & Discovery Integration Test
 *
 * Tests product discovery features:
 * 1. Full-text search
 * 2. Category browsing
 * 3. Filtering and sorting
 * 4. Search suggestions
 * 5. Recently viewed
 * 6. Recommendations
 */
describe('Integration - Search & Discovery (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let customer: any;
  let store1: any;
  let store2: any;
  let products: any[];

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        StoreModule,
        ProductsModule,
        AuthModule,
        UserModule,
        CategoriesModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    customer = await authHelper.createAuthenticatedUser();

    const owner1 = await authHelper.createAuthenticatedUser();
    const owner2 = await authHelper.createAuthenticatedUser();

    store1 = await seeder.seedStore(owner1.user, { name: 'Tech Store' });
    store2 = await seeder.seedStore(owner2.user, { name: 'Fashion Store' });

    // Seed products with specific names for search
    products = [
      await seeder.seedProduct(store1, {
        name: 'Premium Wireless Headphones',
        description: 'High-quality audio with noise cancellation',
      }),
      await seeder.seedProduct(store1, {
        name: 'Gaming Keyboard RGB',
        description: 'Mechanical switches with RGB lighting',
      }),
      await seeder.seedProduct(store1, {
        name: 'Wireless Mouse',
        description: 'Ergonomic design for productivity',
      }),
      await seeder.seedProduct(store2, {
        name: 'Cotton T-Shirt',
        description: 'Comfortable everyday wear',
      }),
      await seeder.seedProduct(store2, {
        name: 'Denim Jeans',
        description: 'Classic fit denim',
      }),
    ];
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Full-Text Search', () => {
    it('should search products by name', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products/search')
        .query({ q: 'wireless' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((p: any) =>
          p.name.toLowerCase().includes('wireless')
        )
      ).toBe(true);
    });

    it('should search products by description', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products/search')
        .query({ q: 'mechanical' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle multiple search terms', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products/search')
        .query({ q: 'gaming rgb' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products/search')
        .query({ q: 'nonexistentproduct12345' })
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('Category Browsing', () => {
    it('should browse products by category', async () => {
      // Create categories
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/categories')
        .send({
          name: 'Electronics',
          storeId: store1.id,
        });

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ category: 'Electronics' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should list available categories', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/categories')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter by price range', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ minPrice: 10, maxPrice: 100 })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should sort by price ascending', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ sortBy: 'price', order: 'ASC' })
        .expect(200);

      const prices = response.body.data.map((p: any) => p.price);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });

    it('should sort by price descending', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ sortBy: 'price', order: 'DESC' })
        .expect(200);

      const prices = response.body.data.map((p: any) => p.price);
      const sorted = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sorted);
    });

    it('should filter by store', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ storeId: store1.id })
        .expect(200);

      expect(
        response.body.data.every((p: any) => p.storeId === store1.id)
      ).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({
          storeId: store1.id,
          minPrice: 10,
          maxPrice: 500,
          sortBy: 'price',
          order: 'ASC',
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Recently Viewed', () => {
    it('should track recently viewed products', async () => {
      const product = products[0];

      // View product
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/products/${product.id}`)
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check recently viewed
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/users/${customer.user.id}/recently-viewed`)
        .expect(200);

      expect(response.body.data.some((p: any) => p.id === product.id)).toBe(
        true
      );
    });

    it('should limit recently viewed to last N items', async () => {
      // View multiple products
      for (const product of products.slice(0, 3)) {
        await authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/products/${product.id}`)
          .expect(200);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/users/${customer.user.id}/recently-viewed`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      const page1 = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(page1.body.data.length).toBeLessThanOrEqual(2);

      const page2 = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ limit: 2, offset: 2 })
        .expect(200);

      expect(page2.body.data.length).toBeLessThanOrEqual(2);

      // Pages should have different products
      const page1Ids = page1.body.data.map((p: any) => p.id);
      const page2Ids = page2.body.data.map((p: any) => p.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });
  });
});
