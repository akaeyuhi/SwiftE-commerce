import { INestApplication } from '@nestjs/common';
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
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  describe('POST /auth/refresh', () => {
    let testUser: any;
    let loginResponse: any;
    let cookies: string[];
    let csrfToken: string | null;

    beforeEach(async () => {
      testUser = await authHelper.createAuthenticatedUser();

      loginResponse = await appHelper.request().post('/auth/login').send({
        email: testUser.user.email,
        password: 'Test123!@#',
      });

      cookies = AssertionHelper.getCookies(loginResponse);
      csrfToken = AssertionHelper.getCookieValue(loginResponse, 'XSRF-TOKEN')!;
    });

    it('should refresh access token with valid refresh token from cookie', async () => {
      // ✅ Cookie is sent automatically to /auth/refresh due to path restriction
      const response = await appHelper
        .request()
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(testUser.accessToken);
    });

    it('should reject refresh without CSRF token', async () => {
      const response = await appHelper
        .request()
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('CSRF');
    });

    it('should reject invalid refresh token', async () => {
      const response = await appHelper
        .request()
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .set('X-CSRF-Token', 'test')
        .send();

      expect(response.status).toBe(401);
    });

    it('should issue new refresh token', async () => {
      const response = await appHelper
        .request()
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!)
        .send();

      expect(response.status).toBe(200);
      AssertionHelper.assertCookie(response, 'refreshToken');
    });
  });

  describe('POST /auth/logout', () => {
    let testUser: any;
    let loginResponse: any;
    let refreshToken: string;

    beforeEach(async () => {
      testUser = await authHelper.createAuthenticatedUser();

      loginResponse = await appHelper.request().post('/auth/login').send({
        email: testUser.user.email,
        password: 'Test123!@#',
      });

      const refreshTokenCookie = loginResponse.headers['set-cookie']?.find(
        (cookie: string) => cookie.startsWith('refreshToken=')
      );

      refreshToken = refreshTokenCookie?.split('=')[1]?.split(';')[0] || '';
    });

    it('should logout with refresh token in body', async () => {
      const response = await appHelper.request().post('/auth/logout').send({
        refreshToken,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should ban refresh token on logout', async () => {
      await appHelper
        .request()
        .post('/auth/logout')
        .send({
          refreshToken,
        })
        .expect(201);

      const cookies = AssertionHelper.getCookies(loginResponse);
      const csrfToken = AssertionHelper.getCookieValue(
        loginResponse,
        'XSRF-TOKEN'
      );

      const response = await appHelper
        .request()
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken!)
        .send();

      expect(response.status).toBe(401);
    });

    it('should work without token (just clear cookies)', async () => {
      const response = await appHelper.request().post('/auth/logout').send();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
