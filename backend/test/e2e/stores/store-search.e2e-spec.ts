import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Store - Search (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let adminUser: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, AuthModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();

    // Seed test stores
    await seeder.seedStore(adminUser.user, {
      name: 'Tech Store',
      description: 'Electronics',
    });
    await seeder.seedStore(adminUser.user, {
      name: 'Fashion Store',
      description: 'Clothing',
    });
    await seeder.seedStore(adminUser.user, {
      name: 'Tech Hub',
      description: 'Gadgets',
    });
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /stores/search', () => {
    it('should search stores by name', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: 'tech' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(
        response.body.every((store: any) =>
          store.name.toLowerCase().includes('tech')
        )
      ).toBe(true);
    });

    it('should require query parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search');

      AssertionHelper.assertErrorResponse(response, 400, 'query');
    });

    it('should reject empty query', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: '   ' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: 'store', limit: 1 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should enforce max limit of 50', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: 'store', limit: 100 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(50);
    });

    it('should support sortBy parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: 'store', sortBy: 'followers' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/search')
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /stores/advanced-search', () => {
    it('should perform advanced search', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/stores/advanced-search')
        .send({
          query: 'tech',
          sortBy: 'name',
          sortOrder: 'ASC',
          limit: 20,
          offset: 0,
        })
        .expect(200);

      expect(response.body).toHaveProperty('stores');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.stores)).toBe(true);
    });

    it('should filter by revenue range', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/stores/advanced-search')
        .send({
          minRevenue: 1000,
          maxRevenue: 50000,
          limit: 20,
        })
        .expect(200);

      expect(response.body.stores).toBeDefined();
    });

    it('should filter by product count', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/stores/advanced-search')
        .send({
          minProducts: 5,
          limit: 20,
        })
        .expect(200);

      expect(response.body.stores).toBeDefined();
    });

    it('should calculate correct page number', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/stores/advanced-search')
        .send({
          limit: 10,
          offset: 20,
        })
        .expect(200);

      expect(response.body.page).toBe(3); // offset 20 / limit 10 + 1
    });
  });

  describe('GET /stores/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/autocomplete')
        .query({ q: 'te' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((store: any) => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('name');
        expect(store).toHaveProperty('followerCount');
      });
    });

    it('should require at least 2 characters', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/autocomplete')
        .query({ q: 't' })
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/autocomplete')
        .query({ q: 'store', limit: 5 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should enforce max limit of 20', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/autocomplete')
        .query({ q: 'store', limit: 50 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(20);
    });
  });
});
