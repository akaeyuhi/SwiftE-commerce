import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Auth - Tokens (E2E)', () => {
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

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'Test123!@#',
        });

      const cookies = AssertionHelper.getCookies(loginResponse);
      const csrfToken = AssertionHelper.getCookieValue(
        loginResponse,
        'XSRF-TOKEN'
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(user.accessToken);
    });

    it('should reject refresh without CSRF token', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'Test123!@#',
        });

      const cookies = AssertionHelper.getCookies(loginResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('CSRF');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .set('X-CSRF-Token', 'test');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should issue new refresh token', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'Test123!@#',
        });

      const cookies = AssertionHelper.getCookies(loginResponse);
      const csrfToken = AssertionHelper.getCookieValue(
        loginResponse,
        'XSRF-TOKEN'
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!)
        .expect(200);

      AssertionHelper.assertCookie(response, 'refreshToken');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'Test123!@#',
        });

      const cookies = AssertionHelper.getCookies(loginResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should ban refresh token on logout', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.user.email,
          password: 'Test123!@#',
        });

      const cookies = AssertionHelper.getCookies(loginResponse);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      // Try to use the same refresh token
      const csrfToken = AssertionHelper.getCookieValue(
        loginResponse,
        'XSRF-TOKEN'
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should work without cookies (using body)', async () => {
      const user = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken: user.refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
