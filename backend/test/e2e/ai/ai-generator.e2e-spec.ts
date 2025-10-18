import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { AiModule } from 'src/modules/ai/ai.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('AI Generator (E2E)', () => {
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
    await appHelper.cleanup();
  });

  describe('POST /stores/:storeId/ai/generator/names', () => {
    it('should generate product names', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'modern tech',
          seed: 'smartphone accessories',
          count: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('names');
      expect(Array.isArray(response.body.data.names)).toBe(true);
      expect(response.body.data.names.length).toBeGreaterThan(0);
      expect(response.body.data.metadata).toHaveProperty('count');
      expect(response.body.data.metadata).toHaveProperty('storeStyle');
      expect(response.body.data.metadata).toHaveProperty('seed');
    });

    it('should allow store moderator', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'vintage',
          seed: 'clothing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent regular user', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'modern',
          seed: 'test',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should use default count if not provided', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'minimalist',
          seed: 'furniture',
        })
        .expect(200);

      expect(response.body.data.names.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should support custom options', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'luxury',
          seed: 'watches',
          count: 3,
          options: {
            maxLength: 20,
            includeEmoji: false,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include user context in metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'tech',
          seed: 'gadgets',
        })
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('userId');
      expect(response.body.data.metadata).toHaveProperty('storeId');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');
    });
  });

  describe('POST /stores/:storeId/ai/generator/description', () => {
    it('should generate product description', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/description`)
        .send({
          name: 'Premium Wireless Headphones',
          productSpec: {
            category: 'Electronics',
            features: [
              'Noise cancellation',
              'Bluetooth 5.0',
              '30-hour battery',
            ],
            price: 299.99,
          },
          tone: 'professional and engaging',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('description');
      expect(typeof response.body.data.result.description).toBe('string');
      expect(response.body.data.result.description.length).toBeGreaterThan(0);
      expect(response.body.data.metadata).toHaveProperty('productName');
      expect(response.body.data.metadata).toHaveProperty('tone');
    });

    it('should use default tone if not provided', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/description`)
        .send({
          name: 'Leather Wallet',
          productSpec: {
            category: 'Accessories',
            material: 'Genuine leather',
          },
        })
        .expect(200);

      expect(response.body.data.metadata.tone).toBe(
        'professional and engaging'
      );
    });

    it('should support custom tone', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/description`)
        .send({
          name: 'Gaming Keyboard',
          productSpec: {
            category: 'Gaming',
            features: ['RGB lighting', 'Mechanical switches'],
          },
          tone: 'casual and exciting',
        })
        .expect(200);

      expect(response.body.data.metadata.tone).toBe('casual and exciting');
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/description`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should support custom options', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/description`)
        .send({
          name: 'Smart Watch',
          productSpec: {
            category: 'Electronics',
          },
          options: {
            maxLength: 500,
            includeBulletPoints: true,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /stores/:storeId/ai/generator/ideas', () => {
    it('should generate product ideas', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/ideas`)
        .send({
          storeStyle: 'eco-friendly home goods',
          seed: 'sustainable living',
          count: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ideas');
      expect(Array.isArray(response.body.data.ideas)).toBe(true);
      expect(response.body.data.ideas.length).toBeGreaterThan(0);
    });

    it('should include metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/ideas`)
        .send({
          storeStyle: 'fitness',
          seed: 'workout equipment',
        })
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('count');
      expect(response.body.data.metadata).toHaveProperty('storeStyle');
      expect(response.body.data.metadata).toHaveProperty('seed');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');
    });

    it('should use default count', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/ideas`)
        .send({
          storeStyle: 'tech',
          seed: 'innovation',
        })
        .expect(200);

      expect(response.body.data.ideas.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/ideas`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /stores/:storeId/ai/generator/custom', () => {
    it('should generate custom content', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/custom`)
        .send({
          prompt: 'Write a product announcement for a new smartwatch launch',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('result');
      expect(typeof response.body.data.result).toBe('string');
      expect(response.body.data.metadata).toHaveProperty('promptLength');
    });

    it('should support custom options', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/custom`)
        .send({
          prompt: 'Create a catchy slogan for an organic food store',
          options: {
            maxTokens: 100,
            temperature: 0.7,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate prompt is required', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/custom`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should include metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/custom`)
        .send({
          prompt: 'Test prompt',
        })
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('promptLength');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');
      expect(response.body.data.metadata).toHaveProperty('userId');
      expect(response.body.data.metadata).toHaveProperty('storeId');
    });
  });

  describe('GET /stores/:storeId/ai/generator/types', () => {
    it('should get generation types', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/types`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('types');
      expect(Array.isArray(response.body.data.types)).toBe(true);
      expect(response.body.data.metadata).toHaveProperty('count');
      expect(response.body.data.metadata).toHaveProperty('retrievedAt');
    });

    it('should be accessible to moderators', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/generator/types`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include type configurations', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/types`)
        .expect(200);

      expect(response.body.data.types.length).toBeGreaterThan(0);
    });
  });

  describe('GET /stores/:storeId/ai/generator/usage', () => {
    it('should get usage statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/usage`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('storeId');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/stores/${store.id}/ai/generator/usage`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should support date filtering', async () => {
      const dateFrom = '2025-01-01';
      const dateTo = '2025-12-31';

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/usage`)
        .query({ dateFrom, dateTo })
        .expect(200);

      expect(response.body.data.metadata.period).toEqual({
        from: dateFrom,
        to: dateTo,
      });
    });

    it('should include metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/usage`)
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('userId');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');
    });
  });

  describe('GET /stores/:storeId/ai/generator/health', () => {
    it('should get health status as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/generator/health`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data.service).toBe('ai-generator');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should prevent non-admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/ai/generator/health`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return health details', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/generator/health`)
        .expect(200);

      expect(response.body.data).toHaveProperty('healthy');
    });

    it('should handle service errors gracefully', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/ai/generator/health`);

      expect([200, 500]).toContain(response.status);
      expect(response.body.data).toHaveProperty('service');
    });
  });

  describe('Security & Permissions', () => {
    it('should enforce authentication on all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: `/stores/${store.id}/ai/generator/names` },
        {
          method: 'post',
          path: `/stores/${store.id}/ai/generator/description`,
        },
        { method: 'post', path: `/stores/${store.id}/ai/generator/ideas` },
        { method: 'post', path: `/stores/${store.id}/ai/generator/custom` },
        { method: 'get', path: `/stores/${store.id}/ai/generator/types` },
        { method: 'get', path: `/stores/${store.id}/ai/generator/usage` },
        { method: 'get', path: `/stores/${store.id}/ai/generator/health` },
      ];

      for (const endpoint of endpoints) {
        const response = await appHelper
          .request()
          [endpoint.method](endpoint.path);
        AssertionHelper.assertErrorResponse(response, 401);
      }
    });

    it('should enforce role-based access', async () => {
      const restrictedEndpoints = [
        {
          method: 'post',
          path: `/stores/${store.id}/ai/generator/names`,
          body: { storeStyle: 'test', seed: 'test' },
        },
        {
          method: 'post',
          path: `/stores/${store.id}/ai/generator/description`,
          body: { name: 'test', productSpec: {} },
        },
      ];

      for (const endpoint of restrictedEndpoints) {
        const response = await authHelper
          .authenticatedRequest(regularUser.accessToken)
          [endpoint.method](endpoint.path)
          .send(endpoint.body);

        AssertionHelper.assertErrorResponse(response, 403);
      }
    });

    it('should include user context in all responses', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: 'modern',
          seed: 'tech',
        })
        .expect(200);

      expect(response.body.data.metadata.userId).toBe(storeOwner.user.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/names`)
        .send({
          storeStyle: '',
          seed: '',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should handle service errors', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/ai/generator/custom`)
        .send({
          prompt: 'test',
        });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });
});
