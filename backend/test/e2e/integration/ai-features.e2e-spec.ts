import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AiModule } from 'src/modules/ai/ai.module';
import { AuthModule } from 'src/modules/auth/auth.module';

/**
 * AI Features Integration Test
 *
 * Tests AI-powered features:
 * 1. Product name generation
 * 2. Product description generation
 * 3. Product ideas generation
 * 4. Custom content generation
 * 5. AI usage tracking
 * 6. Usage limits and quotas
 * 7. AI logs and analytics
 * 8. Integration with product creation
 */
describe('Integration - AI Features (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, ProductsModule, AuthModule, UserModule, AiModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Product Name Generation Workflow', () => {
    it('Step 1: Store owner generates product names', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'modern tech',
          seed: 'wireless earbuds',
          count: 5,
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.names).toBeDefined();
      expect(Array.isArray(response.body.data.names)).toBe(true);
      expect(response.body.data.names.length).toBe(5);
    });

    it('Step 2: AI usage logged', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check AI logs
      const logsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs')
        .expect(200);

      expect(logsResponse.body.data.logs.length).toBeGreaterThan(0);
      expect(
        logsResponse.body.data.logs.some(
          (log: any) => log.feature === 'product_name_generation'
        )
      ).toBe(true);
    });

    it('Step 3: Owner creates product with AI-generated name', async () => {
      // Generate names
      const namesResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'minimalist',
          seed: 'phone case',
          count: 3,
          storeId: store.id,
        })
        .expect(200);

      const generatedName = namesResponse.body.data.names[0];

      // Create product with generated name
      const productResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/products')
        .send({
          name: generatedName,
          description: 'Product description',
          price: 29.99,
          storeId: store.id,
        })
        .expect(201);

      expect(productResponse.body.name).toBe(generatedName);
    });
  });

  describe('Product Description Generation Workflow', () => {
    it('Step 1: Generate description for new product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/description')
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
            material: 'Premium leather and aluminum',
          },
          tone: 'professional and engaging',
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBeDefined();
      expect(typeof response.body.data.description).toBe('string');
      expect(response.body.data.description.length).toBeGreaterThan(50);
    });

    it('Step 2: Use generated description in product', async () => {
      // Generate description
      const descResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/description')
        .send({
          name: 'Smart Watch Pro',
          productSpec: {
            category: 'Wearables',
            features: ['Heart rate monitoring', 'GPS', 'Water resistant'],
          },
          storeId: store.id,
        })
        .expect(200);

      const generatedDesc = descResponse.body.data.description;

      // Create product
      const productResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/products')
        .send({
          name: 'Smart Watch Pro',
          description: generatedDesc,
          price: 399.99,
          storeId: store.id,
        })
        .expect(201);

      expect(productResponse.body.description).toBe(generatedDesc);
    });

    it('Step 3: Generate description with different tones', async () => {
      const tones = ['professional', 'casual', 'enthusiastic'];

      for (const tone of tones) {
        const response = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/ai/generator/description')
          .send({
            name: 'Gaming Keyboard',
            productSpec: {
              category: 'Gaming',
              features: ['RGB lighting', 'Mechanical switches'],
            },
            tone,
            storeId: store.id,
          })
          .expect(200);

        expect(response.body.data.description).toBeDefined();
      }
    });
  });

  describe('Product Ideas Generation Workflow', () => {
    it('Step 1: Generate product ideas for store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/ideas')
        .send({
          storeStyle: 'eco-friendly home goods',
          seed: 'sustainable living',
          count: 5,
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ideas).toBeDefined();
      expect(Array.isArray(response.body.data.ideas)).toBe(true);
      expect(response.body.data.ideas.length).toBe(5);
    });

    it('Step 2: Create multiple products from generated ideas', async () => {
      // Generate ideas
      const ideasResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/ideas')
        .send({
          storeStyle: 'tech accessories',
          seed: 'productivity',
          count: 3,
          storeId: store.id,
        })
        .expect(200);

      const ideas = ideasResponse.body.data.ideas;

      // Create products from ideas
      const createdProducts = [] as any[];

      for (const idea of ideas) {
        const productResponse = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/products')
          .send({
            name: idea.name || idea,
            description: idea.description || 'AI-generated product',
            price: Math.floor(Math.random() * 100) + 20,
            storeId: store.id,
          })
          .expect(201);

        createdProducts.push(productResponse.body);
      }

      expect(createdProducts.length).toBe(3);
    });
  });

  describe('Custom Content Generation', () => {
    it('should generate custom marketing content', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/custom')
        .send({
          prompt:
            'Write a promotional announcement for our new summer collection sale',
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.data.result).toBeDefined();
      expect(typeof response.body.data.result).toBe('string');
    });

    it('should generate product announcement', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/custom')
        .send({
          prompt: `Create a product launch announcement for a new smartwatch with health tracking features`,
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.data.result.length).toBeGreaterThan(50);
    });

    it('should generate FAQ content', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/custom')
        .send({
          prompt:
            'Generate 5 FAQ questions and answers for an electronics store',
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('AI Usage Tracking and Analytics', () => {
    beforeEach(async () => {
      // Generate some AI activity
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'modern',
          seed: 'test',
          storeId: store.id,
        });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/description')
        .send({
          name: 'Test Product',
          productSpec: {},
          storeId: store.id,
        });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should track AI usage per store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/ai/generator/stores/${store.id}/usage`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should get AI usage statistics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should get top AI features used', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs/features/top')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.features).toBeDefined();
      expect(Array.isArray(response.body.data.features)).toBe(true);
    });

    it('should track daily AI usage', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs/daily')
        .query({ days: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dailyUsage).toBeDefined();
    });
  });

  describe('Complete Product Creation with AI', () => {
    it('should create product with AI-assisted workflow', async () => {
      // Step 1: Generate product names
      const namesResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'premium tech',
          seed: 'bluetooth speaker',
          count: 5,
          storeId: store.id,
        })
        .expect(200);

      const productName = namesResponse.body.data.names[0];

      // Step 2: Generate description
      const descResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/description')
        .send({
          name: productName,
          productSpec: {
            category: 'Audio',
            features: ['360-degree sound', 'Waterproof', '20-hour battery'],
            price: 129.99,
          },
          tone: 'professional and engaging',
          storeId: store.id,
        })
        .expect(200);

      const productDescription = descResponse.body.data.description;

      // Step 3: Create product
      const productResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/products')
        .send({
          name: productName,
          description: productDescription,
          price: 129.99,
          storeId: store.id,
        })
        .expect(201);

      expect(productResponse.body.name).toBe(productName);
      expect(productResponse.body.description).toBe(productDescription);

      // Step 4: Verify AI logs
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const logsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs')
        .expect(200);

      const productCreationLogs = logsResponse.body.data.logs.filter(
        (log: any) =>
          log.feature === 'product_name_generation' ||
          log.feature === 'product_description_generation'
      );

      expect(productCreationLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('AI Usage Permissions', () => {
    it('moderator should access AI features', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'casual',
          seed: 'test',
          storeId: store.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('regular user should not access AI features', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: 'test',
          seed: 'test',
          storeId: store.id,
        });

      expect(response.status).toBe(403);
    });

    it('only store admin can view AI usage stats', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .get(`/ai/generator/stores/${store.id}/usage`);

      expect(response.status).toBe(403);
    });
  });

  describe('Bulk Product Generation', () => {
    it('should create multiple products using AI', async () => {
      // Generate ideas
      const ideasResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/ideas')
        .send({
          storeStyle: 'fitness equipment',
          seed: 'home workout',
          count: 3,
          storeId: store.id,
        })
        .expect(200);

      const ideas = ideasResponse.body.data.ideas;

      // Generate descriptions for each idea
      const productsData = [] as any[];

      for (const idea of ideas) {
        const descResponse = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/ai/generator/description')
          .send({
            name: idea.name || idea,
            productSpec: {
              category: 'Fitness',
              features: idea.features || ['Durable', 'Ergonomic'],
            },
            storeId: store.id,
          })
          .expect(200);

        productsData.push({
          name: idea.name || idea,
          description: descResponse.body.data.description,
          price: Math.floor(Math.random() * 200) + 50,
        });
      }

      // Create all products
      const createdProducts = [] as any[];

      for (const productData of productsData) {
        const response = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/products')
          .send({
            ...productData,
            storeId: store.id,
          })
          .expect(201);

        createdProducts.push(response.body);
      }

      expect(createdProducts.length).toBe(3);

      // Verify all products created
      const allProducts = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/products')
        .query({ storeId: store.id })
        .expect(200);

      expect(allProducts.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('AI Error Tracking', () => {
    it('should log AI errors', async () => {
      // Attempt generation with invalid data
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/ai/generator/names')
        .send({
          storeStyle: '',
          seed: '',
          storeId: store.id,
        })
        .expect(400);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check error logs
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs/errors')
        .expect(200);

      expect(response.body.data.errorLogs).toBeDefined();
    });
  });

  describe('AI Generation Types', () => {
    it('should list available AI generation types', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/generator/types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.types).toBeDefined();
      expect(Array.isArray(response.body.data.types)).toBe(true);
      expect(response.body.data.types.length).toBeGreaterThan(0);
    });

    it('should include type configurations', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/generator/types')
        .expect(200);

      const types = response.body.data.types;
      types.forEach((type: any) => {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('description');
      });
    });
  });

  describe('AI Usage Trends', () => {
    it('should track usage trends over time', async () => {
      // Generate some activity
      for (let i = 0; i < 5; i++) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/ai/generator/names')
          .send({
            storeStyle: 'test',
            seed: `test-${i}`,
            storeId: store.id,
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/ai/logs/trends')
        .query({ days: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trends).toBeDefined();
    });
  });
});
