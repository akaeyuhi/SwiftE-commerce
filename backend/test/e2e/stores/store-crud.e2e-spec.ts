import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Store - CRUD (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    regularUser = await authHelper.createAuthenticatedUser();
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  afterEach(async () => {
    const storeRepo = appHelper.getDataSource().getRepository('Store');
    await storeRepo.clear();
  });

  describe('GET /stores', () => {
    it('should list all stores with stats', async () => {
      await seeder.seedStore(regularUser.user);
      await seeder.seedStore(regularUser.user);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('productCount');
      expect(response.body[0]).toHaveProperty('followerCount');
      expect(response.body[0]).toHaveProperty('totalRevenue');
    });

    it('should return empty array when no stores', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get('/stores');

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });

  describe('GET /stores/:id', () => {
    it('should get store by id', async () => {
      const store = await seeder.seedStore(regularUser.user);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}`)
        .expect(200);

      expect(response.body.id).toBe(store.id);
      expect(response.body.name).toBe(store.name);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should return 404 for non-existent store', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/00000000-0000-0000-0000-000000000000');

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/stores/invalid-uuid');

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /stores', () => {
    const validStoreData = {
      name: 'Test Store',
      description: 'A great test store',
    };

    it('should create a new store', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/stores')
        .send(validStoreData)
        .expect(201);

      expect(response.body.name).toBe(validStoreData.name);
      expect(response.body.description).toBe(validStoreData.description);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should initialize stats to zero', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/stores')
        .send(validStoreData)
        .expect(201);

      expect(response.body.productCount).toBe(0);
      expect(response.body.followerCount).toBe(0);
      expect(response.body.totalRevenue).toBe(0);
      expect(response.body.orderCount).toBe(0);
    });

    it('should require name', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/stores')
        .send({ description: 'No name' });

      AssertionHelper.assertErrorResponse(response, 400, 'name');
    });

    it('should validate name length', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/stores')
        .send({
          ...validStoreData,
          name: 'ab', // Too short
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(validStoreData);

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });

  describe('PATCH /stores/:id', () => {
    it('should update store', async () => {
      const store = await seeder.seedStore(regularUser.user);

      const updateData = {
        name: 'Updated Store Name',
        description: 'Updated description',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .patch(`/stores/${store.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent store', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .patch('/stores/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Update' });

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate update data', async () => {
      const store = await seeder.seedStore(regularUser.user);

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .patch(`/stores/${store.id}`)
        .send({ name: 'a' }); // Too short

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('DELETE /stores/:id', () => {
    it('should soft delete store', async () => {
      const store = await seeder.seedStore(regularUser.user);

      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}`)
        .expect(200);

      // Verify soft delete in database
      const storeRepo = appHelper.getDataSource().getRepository('Store');
      const deletedStore = await storeRepo.findOne({
        where: { id: store.id },
        withDeleted: true,
      });

      expect(deletedStore).toBeDefined();
      expect(deletedStore?.deletedAt).toBeDefined();
    });

    it('should return 404 for non-existent store', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete('/stores/00000000-0000-0000-0000-000000000000');

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });
});
