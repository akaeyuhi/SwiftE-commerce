import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { EmailModule } from 'src/modules/email/email.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { Store } from 'src/entities/store/store.entity';
import { SeederHelper } from 'test/e2e/helpers/seeder.helper';

describe('Email - Admin (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let store: Store;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [EmailModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('GET /email/health', () => {
    it('should get email service health', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/email/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data).toHaveProperty('healthy');
      expect(response.body.data).toHaveProperty('providers');
      expect(response.body.data).toHaveProperty('queue');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/email/health');

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should check all email providers', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/email/health')
        .expect(200);

      expect(Array.isArray(response.body.data.providers)).toBe(true);

      response.body.data.providers.forEach((provider: any) => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('healthy');
      });
    });
  });

  describe('GET /email/queue/stats', () => {
    it('should get email queue statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/email/queue/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queue');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('retrievedAt');
    });

    it('should include queue metrics', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/email/queue/stats')
        .expect(200);

      const stats = response.body.data.stats;
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/email/queue/stats');

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return numeric counts', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get('/email/queue/stats')
        .expect(200);

      const stats = response.body.data.stats;
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/email/send' },
        { method: 'post', path: '/email/user-confirmation' },
        { method: 'post', path: '/email/welcome' },
        { method: 'post', path: `/email/${store.id}/stock-alert` },
        { method: 'post', path: `/email/${store.id}/low-stock-warning` },
        { method: 'get', path: '/email/health' },
        { method: 'get', path: '/email/queue/stats' },
      ];

      for (const endpoint of endpoints) {
        const response = await appHelper
          .request()
          [endpoint.method](endpoint.path);
        AssertionHelper.assertErrorResponse(response, 401);
      }
    });

    it('should enforce role-based access control', async () => {
      const regularUser = await authHelper.createAuthenticatedUser();

      // Admin-only endpoints
      const adminEndpoints = [
        {
          method: 'post',
          path: '/email/send',
          body: {
            to: [{ email: 'test@example.com' }],
            subject: 'Test',
            html: 'Test',
          },
        },
        { method: 'get', path: '/email/health' },
        { method: 'get', path: '/email/queue/stats' },
      ];

      for (const endpoint of adminEndpoints) {
        const request = authHelper
          .authenticatedRequest(regularUser.accessToken)
          [endpoint.method](endpoint.path);

        if (endpoint.body) {
          request.send(endpoint.body);
        }

        const response = await request;
        AssertionHelper.assertErrorResponse(response, 403);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle email service errors gracefully', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'test@example.com', name: 'Test' }],
          subject: 'Test',
          html: '<p>Test</p>',
        });

      // Should either succeed or return proper error
      expect([200, 201, 400, 500]).toContain(response.status);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should validate email addresses', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'not-an-email', name: 'Test' }],
          subject: 'Test',
          html: 'Test',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should handle missing template data', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/user-confirmation')
        .send({
          userEmail: 'test@example.com',
          // Missing required fields
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });
});
