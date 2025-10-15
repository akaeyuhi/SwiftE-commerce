import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { AiModule } from 'src/modules/ai/ai.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('AI Logs (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [AiModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
    await seeder.assignStoreModerator(storeModerator.user.id, store.id);
  }, 60000);

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['ai_logs']);
  });

  describe('POST /stores/:storeId/ai/logs', () => {
    it('should create AI log entry', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'product_description',
          prompt: 'Generate product description',
          details: { productId: 'prod-123' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logId');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should allow store moderator to create logs', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'image_generation',
          prompt: 'Generate product image',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should prevent regular user from creating logs', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'product_description',
          prompt: 'Test',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'test',
          prompt: 'test',
        });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should store log details', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'seo_optimization',
          prompt: 'Optimize SEO',
          details: {
            type: 'meta_description',
            length: 150,
          },
        })
        .expect(201);

      const logRepo = appHelper.getDataSource().getRepository('AiLog');
      const logs = await logRepo.find({ where: { storeId: store.id } });

      expect(logs.length).toBe(1);
      expect(logs[0].feature).toBe('seo_optimization');
      expect(logs[0].details).toMatchObject({
        type: 'meta_description',
        length: 150,
      });
    });
  });

  describe('GET /stores/:storeId/ai/logs', () => {
    beforeEach(async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'product_description',
          prompt: 'Generate description 1',
        });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'image_generation',
          prompt: 'Generate image',
        });
    });

    it('should get logs', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(Array.isArray(response.body.data.logs)).toBe(true);
      expect(response.body.data.logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by feature', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .query({ feature: 'product_description' })
        .expect(200);

      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(
        response.body.data.logs.every(
          (log: any) => log.feature === 'product_description'
        )
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .query({ limit: 1, offset: 0 })
        .expect(200);

      expect(response.body.data.logs.length).toBe(1);
    });

    it('should filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .split('T')[0];

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .query({ dateFrom: today, dateTo: tomorrow })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .expect(200);

      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata).toHaveProperty('count');
      expect(response.body.data.metadata).toHaveProperty('retrievedAt');
      expect(response.body.data.metadata).toHaveProperty('filters');
    });
  });

  describe('GET /stores/:storeId/ai/logs/stats', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/ai/logs`)
          .send({
            feature: i % 2 === 0 ? 'product_description' : 'image_generation',
            prompt: `Test prompt ${i}`,
          });
      }
    });

    it('should get usage statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/logs/stats`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should filter stats by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .split('T')[0];

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/stats`)
        .query({ dateFrom: today, dateTo: tomorrow })
        .expect(200);

      expect(response.body.data.metadata.period).toBeDefined();
    });
  });

  describe('GET /stores/:storeId/ai/logs/features/top', () => {
    beforeEach(async () => {
      const features = [
        'product_description',
        'image_generation',
        'seo_optimization',
      ];

      for (const feature of features) {
        for (let i = 0; i < 3; i++) {
          await authHelper
            .authenticatedRequest(storeOwner.accessToken)
            .post(`/stores/${store.id}/ai/logs`)
            .send({
              feature,
              prompt: `Test ${feature}`,
            });
        }
      }
    });

    it('should get top features', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/features/top`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('features');
      expect(Array.isArray(response.body.data.features)).toBe(true);
    });

    it('should support custom limit', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/features/top`)
        .query({ limit: 2 })
        .expect(200);

      expect(response.body.data.features.length).toBeLessThanOrEqual(2);
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/logs/features/top`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:storeId/ai/logs/daily', () => {
    it('should get daily usage', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/daily`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyUsage');
    });

    it('should support custom days parameter', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/daily`)
        .query({ days: 7 })
        .expect(200);

      expect(response.body.data.metadata.days).toBe(7);
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/logs/daily`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:storeId/ai/logs/errors', () => {
    it('should get error logs', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/errors`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('errorLogs');
      expect(Array.isArray(response.body.data.errorLogs)).toBe(true);
    });

    it('should support custom limit', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/errors`)
        .query({ limit: 50 })
        .expect(200);

      expect(response.body.data.metadata.limit).toBe(50);
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/logs/errors`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:storeId/ai/logs/trends', () => {
    it('should get usage trends', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/trends`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
    });

    it('should support custom period', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/trends`)
        .query({ days: 14 })
        .expect(200);

      expect(response.body.data.metadata.period).toBe(14);
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/logs/trends`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:storeId/ai/logs/health', () => {
    it('should get health status as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/logs/health`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data.service).toBe('ai-logs');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/logs/health`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return health details', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/logs/health`)
        .expect(200);

      expect(response.body.data).toHaveProperty('healthy');
    });
  });

  describe('POST /stores/:storeId/ai/logs/cleanup', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/ai/logs`)
          .send({
            feature: 'product_description',
            prompt: `Old log ${i}`,
          });
      }
    });

    it('should cleanup old logs as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/ai/logs/cleanup`)
        .send({
          retentionDays: 30,
          dryRun: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cleanupAt');
    });

    it('should prevent non-admin cleanup', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs/cleanup`)
        .send({
          retentionDays: 30,
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should support dry run mode', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/ai/logs/cleanup`)
        .send({
          retentionDays: 30,
          dryRun: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should use default retention if not provided', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/ai/logs/cleanup`)
        .send({
          dryRun: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security & Permissions', () => {
    it('should enforce authentication on all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: `/stores/${store.id}/ai/logs` },
        { method: 'get', path: `/stores/${store.id}/ai/logs` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/stats` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/features/top` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/daily` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/errors` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/trends` },
        { method: 'get', path: `/stores/${store.id}/ai/logs/health` },
        { method: 'post', path: `/stores/${store.id}/ai/logs/cleanup` },
      ];

      for (const endpoint of endpoints) {
        const response = await appHelper
          .request()
          [endpoint.method](endpoint.path);
        AssertionHelper.assertErrorResponse(response, 401);
      }
    });

    it('should allow admin to access all logs', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/logs`)
        .send({
          feature: 'test',
          prompt: 'Test',
        });

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/logs`)
        .expect(200);

      expect(response.body.data.logs.length).toBeGreaterThan(0);
    });
  });
});
