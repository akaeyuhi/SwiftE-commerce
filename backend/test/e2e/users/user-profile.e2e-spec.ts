import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('User - Profile (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [UserModule, AuthModule, StoreModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    regularUser = await authHelper.createAuthenticatedUser();
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('POST /users', () => {
    it('should register a new user', async () => {
      const userData = {
        email: `newuser_${Date.now()}@example.com`,
        password: 'Test123!@#',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.email).toBe(userData.email);
      expect(response.body.firstName).toBe(userData.firstName);
      expect(response.body.lastName).toBe(userData.lastName);
      expect(response.body).not.toHaveProperty('password');
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should reject duplicate email', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/users')
        .send({
          email: regularUser.user.email,
          password: 'Test123!@#',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      AssertionHelper.assertErrorResponse(response, 400, 'already exists');
    });

    it('should validate email format', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/users')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
        });

      AssertionHelper.assertErrorResponse(response, 400, 'email');
    });

    it('should validate password strength', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/users')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /users/profile', () => {
    it('should get current user profile', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
      expect(response.body.email).toBe(regularUser.user.email);
      expect(response.body.firstName).toBeDefined();
      expect(response.body.lastName).toBeDefined();
      expect(response.body).not.toHaveProperty('password');
    });

    it('should require authentication', async () => {
      const response = await app.getHttpServer().get('/users/profile');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return full profile data', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('isVerified');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      AssertionHelper.assertTimestamps(response.body);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update current user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send(updates)
        .expect(200);

      expect(response.body.firstName).toBe(updates.firstName);
      expect(response.body.lastName).toBe(updates.lastName);
    });

    it('should update only firstName', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'NewFirstName' })
        .expect(200);

      expect(response.body.firstName).toBe('NewFirstName');
    });

    it('should update only lastName', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ lastName: 'NewLastName' })
        .expect(200);

      expect(response.body.lastName).toBe('NewLastName');
    });

    it('should validate firstName length', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ firstName: 'a' }); // Too short

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate lastName length', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ lastName: 'b' }); // Too short

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should not allow updating email', async () => {
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put('/users/profile')
        .send({ email: 'newemail@example.com' });

      // Email should not change
      const profile = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get('/users/profile');

      expect(profile.body.email).toBe(regularUser.user.email);
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .put('/users/profile')
        .send({ firstName: 'Test' });

      AssertionHelper.assertErrorResponse(response, 401);
    });
  });

  describe('GET /users/:id/profile', () => {
    it('should get user profile by id as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${regularUser.user.id}/profile`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.user.id);
      expect(response.body.email).toBe(regularUser.user.email);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${adminUser.user.id}/profile`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/users/00000000-0000-0000-0000-000000000000/profile');

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/users/invalid-uuid/profile');

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /users/:id/verify-email', () => {
    it('should mark user email as verified', async () => {
      const newUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${newUser.user.id}/verify-email`)
        .expect(201);

      expect(response.body).toHaveProperty('isVerified', true);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/verify-email`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle already verified user', async () => {
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/verify-email`)
        .expect(201);

      // Verify again
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/verify-email`)
        .expect(201);

      expect(response.body.isVerified).toBe(true);
    });
  });

  describe('GET /users/:id/email-verified', () => {
    it('should check if email is verified', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/email-verified`)
        .expect(200);

      expect(response.body).toHaveProperty('isEmailVerified');
      expect(typeof response.body.isEmailVerified).toBe('boolean');
    });

    it('should return false for unverified user', async () => {
      const newUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get(`/users/${newUser.user.id}/email-verified`)
        .expect(200);

      expect(response.body.isEmailVerified).toBe(false);
    });

    it('should return true for verified user', async () => {
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${regularUser.user.id}/verify-email`);

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/users/${regularUser.user.id}/email-verified`)
        .expect(200);

      expect(response.body.isEmailVerified).toBe(true);
    });
  });

  describe('POST /users/:id/deactivate', () => {
    it('should deactivate user account', async () => {
      const userToDeactivate = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToDeactivate.user.id}/deactivate`)
        .expect(201);

      expect(response.body.message).toContain('deactivated');
    });

    it('should prevent deactivated user from logging in', async () => {
      const userToDeactivate = await authHelper.createAuthenticatedUser({
        email: `deactivate_${Date.now()}@example.com`,
      });

      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToDeactivate.user.id}/deactivate`);

      // Try to login
      const response = await app.getHttpServer().post('/auth/login').send({
        email: userToDeactivate.user.email,
        password: 'Test123!@#',
      });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/deactivate`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('POST /users/:id/reactivate', () => {
    it('should reactivate deactivated account', async () => {
      const userToReactivate = await authHelper.createAuthenticatedUser();

      // First deactivate
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToReactivate.user.id}/deactivate`);

      // Then reactivate
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${userToReactivate.user.id}/reactivate`)
        .expect(201);

      expect(response.body.message).toContain('reactivated');
    });

    it('should allow reactivated user to login', async () => {
      const userData = {
        email: `reactivate_${Date.now()}@example.com`,
        password: 'Test123!@#',
      };

      const user = await authHelper.createAuthenticatedUser(userData);

      // Deactivate
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${user.user.id}/deactivate`);

      // Reactivate
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${user.user.id}/reactivate`);

      // Should be able to login
      const response = await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/reactivate`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('POST /users/:id/stores', () => {
    it('should create store for user', async () => {
      const storeData = {
        name: 'User Store',
        description: 'A store created for user',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send(storeData)
        .expect(201);

      expect(response.body.name).toBe(storeData.name);
      expect(response.body.description).toBe(storeData.description);
      AssertionHelper.assertUUID(response.body.id);
    });

    it('should set user as store owner', async () => {
      const storeData = {
        name: 'Owned Store',
        description: 'Owned by user',
      };

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send(storeData)
        .expect(201);

      expect(response.body.ownerId).toBe(regularUser.user.id);
    });

    it('should validate store name', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send({ description: 'No name' });

      AssertionHelper.assertErrorResponse(response, 400, 'name');
    });

    it('should allow user to create multiple stores', async () => {
      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send({ name: 'Store 1', description: 'First store' })
        .expect(201);

      await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/users/${regularUser.user.id}/stores`)
        .send({ name: 'Store 2', description: 'Second store' })
        .expect(201);

      const storeRepo = appHelper.getDataSource().getRepository('Store');
      const userStores = await storeRepo.find({
        where: { owner: { id: regularUser.user.id } },
      });

      expect(userStores.length).toBeGreaterThanOrEqual(2);
    });
  });
});
