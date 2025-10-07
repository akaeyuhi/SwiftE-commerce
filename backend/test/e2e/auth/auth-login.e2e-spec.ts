import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Auth - Login (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearDatabase();
  });

  describe('POST /auth/login', () => {
    const testPassword = 'Test123!@#';

    it('should login with valid credentials', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(user.user.id);
      expect(response.body.user.email).toBe(user.user.email);

      // Check cookies
      AssertionHelper.assertCookie(response, 'refreshToken');
      AssertionHelper.assertCookie(response, 'XSRF-TOKEN');
    });

    it('should return pending confirmations if any', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('pendingConfirmations');
    });

    it('should reject invalid password', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'WrongPassword123!',
        });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should be case-insensitive for email', async () => {
      await authHelper.createAuthenticatedUser({
        email: 'test@example.com',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: testPassword,
        });

      AssertionHelper.assertErrorResponse(response, 400, 'email');
    });

    it('should require password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        });

      AssertionHelper.assertErrorResponse(response, 400, 'password');
    });

    it('should update lastUsedAt on refresh token', async () => {
      const user = await authHelper.createAuthenticatedUser();

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: testPassword,
        })
        .expect(200);

      const refreshTokenRepo = appHelper
        .getDataSource()
        .getRepository('RefreshToken');
      const token = await refreshTokenRepo.findOne({
        where: { user: { id: user.user.id } },
        order: { createdAt: 'DESC' },
      });

      expect(token).toBeDefined();
      expect(token?.lastUsedAt).toBeDefined();
    });
  });
});
