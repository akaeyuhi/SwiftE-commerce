import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { AdminModule } from 'src/modules/admin/admin.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Admin (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;

  let superAdmin: any;
  let admin1: any;
  let regularUser: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [AdminModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());

    superAdmin = await authHelper.createAdminUser();
    admin1 = await authHelper.createAdminUser();
    regularUser = await authHelper.createAuthenticatedUser();
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /admin/active', () => {
    it('should get list of active admins', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('admins');
      expect(Array.isArray(response.body.data.admins)).toBe(true);
      expect(response.body.data.admins.length).toBeGreaterThanOrEqual(3);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/admin/active');

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should include admin details', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/active')
        .expect(200);

      const admins = response.body.data.admins;
      admins.forEach((admin: any) => {
        expect(admin).toHaveProperty('userId');
        expect(admin).toHaveProperty('assignedBy');
        expect(admin).toHaveProperty('assignedAt');
      });
    });
  });

  describe('GET /admin/history/:userId', () => {
    it('should get admin history for user', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/history/${admin1.user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history');
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/admin/history/${admin1.user.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate user UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/history/invalid-uuid');

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /admin/my-history', () => {
    it('should get own admin history', async () => {
      const response = await authHelper
        .authenticatedRequest(admin1.accessToken)
        .get('/admin/my-history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history');
    });

    it('should be accessible by any authenticated user', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/admin/my-history')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should show empty history for non-admin', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/admin/my-history')
        .expect(200);

      expect(response.body.data.history).toEqual([]);
    });
  });

  describe('POST /admin/assign', () => {
    let newUser: any;

    beforeEach(async () => {
      newUser = await authHelper.createAuthenticatedUser();
    });

    it('should assign admin role to user', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({
          userId: newUser.user.id,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('admin');
      expect(response.body.data.admin.userId).toBe(newUser.user.id);
    });

    it('should track who assigned the role', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({
          userId: newUser.user.id,
        })
        .expect(201);

      expect(response.body.data.admin.assignedBy).toBe(superAdmin.user.id);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/admin/assign')
        .send({
          userId: newUser.user.id,
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent duplicate admin assignment', async () => {
      // First assignment
      await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({
          userId: newUser.user.id,
        })
        .expect(201);

      // Second assignment should fail
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({
          userId: newUser.user.id,
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate user exists', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({
          userId: '00000000-0000-0000-0000-000000000000',
        });

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('DELETE /admin/revoke/:userId', () => {
    let adminToRevoke: any;

    beforeEach(async () => {
      adminToRevoke = await authHelper.createAdminUser();
    });

    it('should revoke admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .delete(`/admin/revoke/${adminToRevoke.user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revoked');
      expect(response.body.data.revoked).toBe(true);
    });

    it('should track who revoked the role', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .delete(`/admin/revoke/${adminToRevoke.user.id}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('revokedBy');
      expect(response.body.data.revokedBy).toBe(superAdmin.user.id);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .delete(`/admin/revoke/${adminToRevoke.user.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should fail if user is not admin', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .delete(`/admin/revoke/${regularUser.user.id}`);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should prevent self-revocation', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .delete(`/admin/revoke/${superAdmin.user.id}`);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /admin/check/:userId', () => {
    it('should check if user is admin', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/check/${admin1.user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isAdmin');
      expect(response.body.data.isAdmin).toBe(true);
    });

    it('should return false for non-admin', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/check/${regularUser.user.id}`)
        .expect(200);

      expect(response.body.data.isAdmin).toBe(false);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/admin/check/${admin1.user.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /admin/stats', () => {
    it('should get admin statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAdmins');
      expect(response.body.data).toHaveProperty('activeAdmins');
      expect(response.body.data.totalAdmins).toBeGreaterThanOrEqual(3);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/admin/stats');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /admin/search', () => {
    it('should search admins by query', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/search')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/search')
        .query({ q: 'test', active: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/admin/search')
        .query({ q: 'test' });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Admin Lifecycle', () => {
    it('should manage complete admin lifecycle', async () => {
      const newUser = await authHelper.createAuthenticatedUser();

      // 1. Check initial status (not admin)
      let status = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/check/${newUser.user.id}`)
        .expect(200);

      expect(status.body.data.isAdmin).toBe(false);

      // 2. Assign admin role
      await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .post('/admin/assign')
        .send({ userId: newUser.user.id })
        .expect(201);

      // 3. Verify admin status
      status = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/check/${newUser.user.id}`)
        .expect(200);

      expect(status.body.data.isAdmin).toBe(true);

      // 4. Check appears in active admins
      const activeAdmins = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get('/admin/active')
        .expect(200);

      expect(
        activeAdmins.body.data.admins.some(
          (a: any) => a.userId === newUser.user.id
        )
      ).toBe(true);

      // 5. Revoke admin role
      await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .delete(`/admin/revoke/${newUser.user.id}`)
        .expect(200);

      // 6. Verify no longer admin
      status = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/check/${newUser.user.id}`)
        .expect(200);

      expect(status.body.data.isAdmin).toBe(false);

      // 7. Check history is maintained
      const history = await authHelper
        .authenticatedRequest(superAdmin.accessToken)
        .get(`/admin/history/${newUser.user.id}`)
        .expect(200);

      expect(history.body.data.history.length).toBeGreaterThan(0);
    });
  });
});
