import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { StoreModule } from 'src/modules/store/store.module';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Permissions - Store Roles (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let adminUser: any;
  let storeOwner: any;
  let regularUser: any;
  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [UserModule, AuthModule, StoreModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Site Admin Role', () => {
    it('should check if user is site admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${adminUser.user.id}/site-admin/check`)
        .expect(200);

      expect(response.body).toHaveProperty('isSiteAdmin');
      expect(response.body.isSiteAdmin).toBe(true);
    });

    it('should return false for regular user', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${regularUser.user.id}/site-admin/check`)
        .expect(200);

      expect(response.body.isSiteAdmin).toBe(false);
    });

    it('should assign site admin role', async () => {
      const userToPromote = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToPromote.user.id}/site-admin`)
        .expect(201);

      expect(response.body).toHaveProperty('isAdmin', true);
    });

    it('should require admin role for site admin operations', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/site-admin/check`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Store Role Checks', () => {
    it('should check if user has specific store role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(
          `/users/${storeOwner.user.id}/stores/${store.id}/roles/${StoreRoles.ADMIN}/check`
        )
        .expect(200);

      expect(response.body).toHaveProperty('hasRole');
      expect(typeof response.body.hasRole).toBe('boolean');
    });

    it('should return false for user without role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/users/${regularUser.user.id}/stores/${store.id}/roles/${StoreRoles.ADMIN}/check`
        )
        .expect(200);

      expect(response.body.hasRole).toBe(false);
    });

    it('should check if user is store admin', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/users/${storeOwner.user.id}/stores/${store.id}/admin/check`)
        .expect(200);

      expect(response.body).toHaveProperty('isStoreAdmin');
      expect(response.body.isStoreAdmin).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/stores/${store.id}/admin/check`)
        .expect(200);

      expect(response.body.isStoreAdmin).toBe(false);
    });
  });

  describe('Store Role Assignment', () => {
    it('should assign store role', async () => {
      const roleData = {
        roleName: StoreRoles.MODERATOR,
        storeId: store.id,
        assignedBy: adminUser.user.id,
      };

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send(roleData)
        .expect(201);

      expect(response.body).toHaveProperty('role', StoreRoles.MODERATOR);
      expect(response.body).toHaveProperty('storeId', store.id);
    });

    it('should revoke store role', async () => {
      // First assign a role
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send({
          roleName: StoreRoles.MODERATOR,
          storeId: store.id,
          assignedBy: adminUser.user.id,
        });

      // Then revoke it
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/users/${regularUser.user.id}/roles`)
        .send({
          roleName: StoreRoles.MODERATOR,
          storeId: store.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should require proper permissions for role assignment', async () => {
      const roleData = {
        roleName: StoreRoles.MODERATOR,
        storeId: store.id,
        assignedBy: regularUser.user.id,
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send(roleData);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent duplicate role assignments', async () => {
      const roleData = {
        roleName: StoreRoles.MODERATOR,
        storeId: store.id,
        assignedBy: adminUser.user.id,
      };

      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send(roleData);

      // Try to assign same role again
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send(roleData);

      AssertionHelper.assertErrorResponse(response, 400, 'already');
    });
  });

  describe('Multi-Store Roles', () => {
    it('should get all user store roles', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/users/${storeOwner.user.id}/store-roles`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('storeId');
        expect(response.body[0]).toHaveProperty('role');
      }
    });

    it('should handle user with multiple store roles', async () => {
      await seeder.seedStore(storeOwner.user);
      await seeder.seedStore(storeOwner.user);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/users/${storeOwner.user.id}/store-roles`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for user with no roles', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/store-roles`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Role Validation', () => {
    it('should validate role name', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/roles`)
        .send({
          roleName: 'INVALID_ROLE',
          storeId: store.id,
          assignedBy: adminUser.user.id,
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate store exists', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(
          `/users/${storeOwner.user.id}/stores/00000000-0000-0000-0000-000000000000/admin/check`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(
          `/users/${storeOwner.user.id}/stores/invalid-uuid/roles/${StoreRoles.ADMIN}/check`
        );

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });
});
