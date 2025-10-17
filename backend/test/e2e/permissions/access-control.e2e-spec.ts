import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Permissions - Access Control (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let ownedStore: any;
  let otherStore: any;
  let product: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [UserModule, AuthModule, StoreModule, ProductsModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Create test users with different roles
    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    // Create stores
    ownedStore = await seeder.seedStore(storeOwner.user);
    otherStore = await seeder.seedStore(adminUser.user);

    // Assign moderator role
    await authHelper
      .authenticatedRequest(adminUser.accessToken)
      .post(`/users/${storeModerator.user.id}/roles`)
      .send({
        roleName: StoreRoles.MODERATOR,
        storeId: ownedStore.id,
        assignedBy: adminUser.user.id,
      });

    await seeder.assignStoreModerator(storeModerator.user.id, ownedStore.id);
  });

  beforeEach(async () => {
    const products = await seeder.seedProducts(ownedStore, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/users/profile' },
        { method: 'get', path: `/stores/${ownedStore.id}/products/byStore` },
        { method: 'post', path: `/stores/${ownedStore.id}/products` },
        { method: 'put', path: '/users/profile' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await appHelper
          .request()
          [endpoint.method](endpoint.path);

        AssertionHelper.assertErrorResponse(response, 401);
      }
    });

    it('should reject invalid tokens', async () => {
      const response = await authHelper
        .authenticatedRequest('invalid.token.here')
        .get('/users/profile');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should reject expired tokens', async () => {
      const response = await authHelper
        .authenticatedRequest('expired.jwt.token')
        .get('/users/profile');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should allow access with valid token', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
    });
  });

  describe('Store Owner Permissions', () => {
    it('should allow store owner to manage own store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${ownedStore.id}`)
        .expect(200);

      expect(response.body.id).toBe(ownedStore.id);
    });

    it('should allow store owner to create products', async () => {
      const productData = {
        name: 'Owner Product',
        description: 'Created by owner',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${ownedStore.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.name).toBe(productData.name);
    });

    it('should allow store owner to delete products', async () => {
      const products = await seeder.seedProducts(ownedStore, 1);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${ownedStore.id}/products/${products[0].id}/soft`)
        .expect(204);
    });

    it('should allow store owner to update store settings', async () => {
      const updates = {
        name: 'Updated Store Name',
        description: 'Updated by owner',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${ownedStore.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
    });

    it('should prevent store owner from accessing other stores', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${otherStore.id}/products`)
        .send({ name: 'Unauthorized Product' });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Store Moderator Permissions', () => {
    it('should allow moderator to view store products', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${ownedStore.id}/products/byStore`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow moderator to create products', async () => {
      const productData = {
        name: 'Moderator Product',
        description: 'Created by moderator',
      };

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${ownedStore.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.name).toBe(productData.name);
    });

    it('should prevent moderator from deleting store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .delete(`/stores/${ownedStore.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent moderator from updating store settings', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .put(`/stores/${ownedStore.id}`)
        .send({ name: 'Unauthorized Update' });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Regular User Permissions', () => {
    it('should allow regular user to view public store data', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${ownedStore.id}`)
        .expect(200);

      expect(response.body.id).toBe(ownedStore.id);
    });

    it('should allow regular user to view products', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${ownedStore.id}/products/byStore`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should prevent regular user from creating products', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${ownedStore.id}/products`)
        .send({ name: 'Unauthorized Product' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user from updating products', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put(`/stores/${ownedStore.id}/products/${product.id}`)
        .send({ name: 'Unauthorized Update' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user from deleting products', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .delete(`/stores/${ownedStore.id}/products/${product.id}/soft`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow regular user to create own store', async () => {
      const storeData = {
        name: 'Regular User Store',
        description: 'Created by regular user',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send(storeData)
        .expect(201);

      expect(response.body.name).toBe(storeData.name);
    });

    it('should allow regular user to manage own profile', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
    });
  });

  describe('Admin User Permissions', () => {
    it('should allow admin to access all stores', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${ownedStore.id}`)
        .expect(200);

      expect(response.body.id).toBe(ownedStore.id);
    });

    it('should allow admin to view any user profile', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${regularUser.user.id}/profile`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
    });

    it('should allow admin to assign roles', async () => {
      const newUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${newUser.user.id}/roles`)
        .send({
          roleName: StoreRoles.MODERATOR,
          storeId: ownedStore.id,
          assignedBy: adminUser.user.id,
        })
        .expect(201);

      expect(response.body.roleName).toBe(StoreRoles.MODERATOR);
    });

    it('should allow admin to revoke roles', async () => {
      const testModerator = await authHelper.createAuthenticatedUser();
      await seeder.assignStoreModerator(testModerator.user.id, ownedStore.id);

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/users/${testModerator.user.id}/roles`)
        .send({
          roleName: StoreRoles.MODERATOR,
          storeId: ownedStore.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should allow admin to deactivate accounts', async () => {
      const userToDeactivate = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToDeactivate.user.id}/deactivate`)
        .expect(201);

      expect(response.body.message).toContain('deactivated');
    });

    it('should allow admin to verify emails', async () => {
      const userToVerify = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToVerify.user.id}/verify-email`)
        .expect(201);

      expect(response.body.isEmailVerified).toBe(true);
    });

    it('should allow admin to recalculate store stats', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${ownedStore.id}/recalculate-stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Cross-Store Access Control', () => {
    it('should prevent user from managing products in other stores', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${otherStore.id}/products`)
        .send({ name: 'Unauthorized Product' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent user from updating other stores', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${otherStore.id}`)
        .send({ name: 'Unauthorized Update' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent user from deleting other stores', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${otherStore.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow viewing public data from any store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${otherStore.id}`)
        .expect(200);

      expect(response.body.id).toBe(otherStore.id);
    });
  });

  describe('Photo Upload Permissions', () => {
    const createTestImage = () =>
      Buffer.from(
        `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
        'base64'
      );

    it('should allow store owner to upload product photos', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${ownedStore.id}/products/${product.id}/photos`)
        .attach('photos', createTestImage(), 'photo.png')
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow moderator to upload product photos', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${ownedStore.id}/products/${product.id}/photos`)
        .attach('photos', createTestImage(), 'photo.png')
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].url).toBeDefined();
    });

    it('should prevent regular user from uploading photos to other stores', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${ownedStore.id}/products/${product.id}/photos`)
        .attach('photos', createTestImage(), 'photo.png');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Category Management Permissions', () => {
    it('should allow store owner to assign categories', async () => {
      const categories = await seeder.seedCategories(ownedStore, 1);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${ownedStore.id}/products/${product.id}/categories/${categories[0].id}`
        )
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should allow moderator to assign categories', async () => {
      const categories = await seeder.seedCategories(ownedStore, 1);

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(
          `/stores/${ownedStore.id}/products/${product.id}/categories/${categories[0].id}`
        )
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should prevent regular user from managing categories', async () => {
      const categories = await seeder.seedCategories(ownedStore, 1);

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(
          `/stores/${ownedStore.id}/products/${product.id}/categories/${categories[0].id}`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Statistics Access Control', () => {
    it('should allow store owner to view store stats', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${ownedStore.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should allow moderator to view store stats', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${ownedStore.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should allow admin to view any store stats', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${ownedStore.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should allow anyone to view product stats', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${ownedStore.id}/products/${product.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('viewCount');
    });
  });

  describe('Search Permissions', () => {
    it('should allow any authenticated user to search stores', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/stores/search')
        .query({ q: 'store' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow any authenticated user to search products', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${ownedStore.id}/products/search`)
        .query({ q: 'product' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication for advanced search', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${ownedStore.id}/products/advanced-search`)
        .send({ query: 'test' });

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should prevent SQL injection in role checks', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/users/${regularUser.user.id}/stores/${ownedStore.id}/roles/'; DROP TABLE users; --/check`
        );

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent privilege escalation attempts', async () => {
      // Try to assign admin role without permission
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/site-admin`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate UUID format in permission checks', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/stores/not-a-uuid/products/byStore');

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should handle concurrent permission checks', async () => {
      const checks = Array(5)
        .fill(null)
        .map(() =>
          authHelper
            .authenticatedRequest(storeOwner.accessToken)
            .get(`/stores/${ownedStore.id}/products/byStore`)
        );

      const responses = await Promise.all(checks);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain session integrity after permission denial', async () => {
      // Try unauthorized action
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${ownedStore.id}/products`)
        .send({ name: 'Unauthorized' });

      // Session should still be valid
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
    });
  });
});
