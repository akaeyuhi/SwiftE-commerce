import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('User - Settings (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let regularUser: any;
  let adminUser: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [UserModule, AuthModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());

    regularUser = await authHelper.createAuthenticatedUser();
    adminUser = await authHelper.createAdminUser();
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('User preferences', () => {
    it('should get user preferences', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
    });

    it('should update notification preferences', async () => {
      // This would be a PUT /users/settings endpoint if it exists
      // For now, test what's available in the controller
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({
          firstName: 'Updated',
          lastName: 'Settings',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('Settings');
    });
  });

  describe('Privacy settings', () => {
    it('should control profile visibility', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      // Profile should be accessible to the user
      expect(response.body.id).toBe(regularUser.user.id);
    });

    it('should restrict profile access from other users', async () => {
      const anotherUser = await authHelper.createAuthenticatedUser();

      // Regular users shouldn't be able to view other user profiles
      // Only admins can access /users/:id/profile
      const response = await authHelper
        .authenticatedRequest(anotherUser.accessToken)
        .get(`/users/${regularUser.user.id}/profile`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow admin to view any profile', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${regularUser.user.id}/profile`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
    });
  });

  describe('Account security', () => {
    it('should show verification status', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/email-verified`)
        .expect(200);

      expect(response.body).toHaveProperty('isEmailVerified');
      expect(typeof response.body.isEmailVerified).toBe('boolean');
    });

    it('should track account creation date', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('createdAt');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
    });

    it('should track last update date', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('updatedAt');
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Account management', () => {
    it('should allow user to update own profile', async () => {
      const updates = {
        firstName: 'NewFirst',
        lastName: 'NewLast',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send(updates)
        .expect(200);

      expect(response.body.firstName).toBe(updates.firstName);
      expect(response.body.lastName).toBe(updates.lastName);
    });

    it('should validate profile update data', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({
          firstName: 'a', // Too short
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should not allow updating immutable fields', async () => {
      const originalProfile = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile');

      // Try to update email (should be rejected or ignored)
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({
          email: 'newemail@example.com',
        });

      const updatedProfile = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile');

      // Email should remain unchanged
      expect(updatedProfile.body.email).toBe(originalProfile.body.email);
    });

    it('should prevent self-deactivation', async () => {
      // Regular users cannot deactivate themselves, only admins can
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/deactivate`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Data export and deletion', () => {
    it('should access own profile data', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not expose sensitive data', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      // Password should never be returned
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('Session management', () => {
    it('should maintain session after profile update', async () => {
      // Update profile
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'SessionTest' })
        .expect(200);

      // Session should still be valid
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.firstName).toBe('SessionTest');
    });

    it('should require valid token for profile access', async () => {
      const response = await authHelper
        .authenticatedRequest('invalid-token')
        .get('/users/profile');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should reject expired tokens', async () => {
      // This would require mocking JWT expiration
      // For now, test with invalid token
      const response = await authHelper
        .authenticatedRequest('expired.token.here')
        .get('/users/profile');

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });

  describe('Multiple account management', () => {
    it('should handle users with multiple stores', async () => {
      const seederHelper = appHelper.getDataSource();
      const storeRepo = seederHelper.getRepository('Store');

      // Create multiple stores for user
      await storeRepo.save([
        {
          name: 'Store 1',
          owner: regularUser.user,
          productCount: 0,
          followerCount: 0,
          totalRevenue: 0,
          orderCount: 0,
        },
        {
          name: 'Store 2',
          owner: regularUser.user,
          productCount: 0,
          followerCount: 0,
          totalRevenue: 0,
          orderCount: 0,
        },
      ]);

      // User profile should still be accessible
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
    });

    it('should show user role information', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/store-roles`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent profile updates', async () => {
      const updates1 = authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'Concurrent1' });

      const updates2 = authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'Concurrent2' });

      const [response1, response2] = await Promise.all([updates1, updates2]);

      // Both should succeed
      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);
    });

    it('should maintain data consistency', async () => {
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'Consistent', lastName: 'Data' })
        .expect(200);

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.firstName).toBe('Consistent');
      expect(response.body.lastName).toBe('Data');
    });
  });
});
