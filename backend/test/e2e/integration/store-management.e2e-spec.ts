import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NewsModule } from 'src/modules/store/news/news.module';

/**
 * Store Management Integration Test
 *
 * Tests complete store owner journey:
 * 1. Store creation and setup
 * 2. Product catalog management
 * 3. Inventory management
 * 4. Order fulfillment
 * 5. Customer communications
 * 6. Staff management
 * 7. Analytics monitoring
 * 8. Store settings
 */
describe('Integration - Store Management (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let newModerator: any;
  let customer: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        StoreModule,
        ProductsModule,
        OrdersModule,
        AuthModule,
        UserModule,
        AnalyticsModule,
        NewsModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    storeOwner = await authHelper.createAuthenticatedUser();
    newModerator = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Store Setup', () => {
    let store: any;

    it('Step 1: Owner creates store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/stores')
        .send({
          name: 'TechGadgets Pro',
          description: 'Premium electronics and gadgets',
          category: 'Electronics',
          settings: {
            currency: 'USD',
            timezone: 'America/New_York',
          },
        })
        .expect(201);

      store = response.body;
      expect(store).toHaveProperty('id');
      expect(store.name).toBe('TechGadgets Pro');
      expect(store.ownerId).toBe(storeOwner.user.id);
    });

    it('Step 2: Owner configures store settings', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/stores/${store.id}`)
        .send({
          settings: {
            autoAcceptOrders: true,
            lowStockThreshold: 10,
            maxOrderQuantity: 100,
            allowReviews: true,
            requireEmailVerification: true,
          },
        })
        .expect(200);

      expect(response.body.settings).toMatchObject({
        autoAcceptOrders: true,
        lowStockThreshold: 10,
      });
    });

    it('Step 3: Owner adds store branding', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/stores/${store.id}`)
        .send({
          logo: 'https://example.com/logo.png',
          banner: 'https://example.com/banner.jpg',
          theme: {
            primaryColor: '#3498db',
            secondaryColor: '#2c3e50',
          },
        })
        .expect(200);

      expect(response.body.logo).toBeDefined();
      expect(response.body.theme).toMatchObject({
        primaryColor: '#3498db',
      });
    });

    it('Step 4: Owner creates product categories', async () => {
      const categories = ['Smartphones', 'Laptops', 'Accessories'];

      for (const categoryName of categories) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/categories')
          .send({
            name: categoryName,
            storeId: store.id,
            description: `${categoryName} category`,
          })
          .expect(201);
      }

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/categories')
        .query({ storeId: store.id })
        .expect(200);

      expect(response.body.data.length).toBe(3);
    });

    it('Step 5: Owner adds products', async () => {
      const products = [
        {
          name: 'Premium Wireless Headphones',
          description: 'High-quality audio experience',
          price: 299.99,
          storeId: store.id,
        },
        {
          name: 'Smart Watch Pro',
          description: 'Track your fitness goals',
          price: 399.99,
          storeId: store.id,
        },
      ];

      for (const productData of products) {
        const response = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post('/products')
          .send(productData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      }
    });

    it('Step 6: Owner creates product variants', async () => {
      // Get products
      const productsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/products')
        .query({ storeId: store.id })
        .expect(200);

      const product = productsResponse.body.data[0];

      // Create variants
      const variants = await seeder.seedVariants(product, 2);

      expect(variants.length).toBe(2);
    });

    it('Step 7: Owner sets inventory', async () => {
      const productsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/products')
        .query({ storeId: store.id })
        .expect(200);

      const product = productsResponse.body.data[0];
      const variantsResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      for (const variant of variantsResponse.body) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(
            `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
          )
          .send({
            quantity: 100,
            lowStockThreshold: 10,
          })
          .expect(200);
      }
    });

    it('Step 8: Store is now live', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}`)
        .expect(200);

      expect(response.body.id).toBe(store.id);
      expect(response.body.name).toBe('TechGadgets Pro');
    });
  });

  describe('Staff Management', () => {
    let store: any;

    beforeAll(async () => {
      store = await seeder.seedStore(storeOwner.user);
    });

    it('should add moderator to store', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/staff`)
        .send({
          userId: newModerator.user.id,
          role: 'MODERATOR',
        })
        .expect(201);

      expect(response.body.userId).toBe(newModerator.user.id);
      expect(response.body.role).toBe('MODERATOR');
    });

    it('moderator should have limited permissions', async () => {
      // Moderator can manage inventory
      const products = await seeder.seedProducts(store, 1);
      const variants = await seeder.seedVariants(products[0], 1);

      const response = await authHelper
        .authenticatedRequest(newModerator.accessToken)
        .patch(
          `/stores/${store.id}/products/${products[0].id}/variants/${variants[0].id}/inventory`
        )
        .send({ delta: 10 })
        .expect(200);

      expect(response.body.quantity).toBeDefined();

      // But cannot delete store
      const deleteResponse = await authHelper
        .authenticatedRequest(newModerator.accessToken)
        .delete(`/stores/${store.id}`);

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Order Fulfillment Workflow', () => {
    let store: any;
    let product: any;
    let order: any;

    beforeAll(async () => {
      store = await seeder.seedStore(storeOwner.user);
      const products = await seeder.seedProducts(store, 1);
      product = products[0];
      const variants = await seeder.seedVariants(product, 1);

      // Set inventory
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variants[0].id}/inventory`
        )
        .send({ quantity: 100 });

      // Customer places order
      const cartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/cart')
        .send({ userId: customer.user.id });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/cart/${cartResponse.body.id}/items`)
        .send({
          productId: product.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      const orderResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/orders')
        .send({
          cartId: cartResponse.body.id,
          shippingAddress: {
            name: 'Customer',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      order = orderResponse.body;
    });

    it('Step 1: Owner views new orders', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get('/orders')
        .query({ storeId: store.id, status: 'PENDING' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].status).toBe('PENDING');
    });

    it('Step 2: Owner accepts and processes order', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({ status: 'PROCESSING' })
        .expect(200);

      expect(response.body.status).toBe('PROCESSING');
    });

    it('Step 3: Owner ships order', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({
          status: 'SHIPPED',
          trackingNumber: '1Z999AA10123456784',
        })
        .expect(200);

      expect(response.body.status).toBe('SHIPPED');
      expect(response.body.trackingNumber).toBeDefined();
    });

    it('Step 4: Customer receives shipping notification', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const notifications = await notificationRepo.find({
        where: { orderId: order.id, type: 'ORDER_SHIPPED' },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('Step 5: Owner marks as delivered', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({ status: 'DELIVERED' })
        .expect(200);

      expect(response.body.status).toBe('DELIVERED');
    });
  });

  describe('Customer Communications', () => {
    let store: any;

    beforeAll(async () => {
      store = await seeder.seedStore(storeOwner.user);

      // Customer follows store
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/follow`)
        .expect(201);
    });

    it('should publish store news', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/news')
        .send({
          storeId: store.id,
          title: 'New Products Launch!',
          content: 'Check out our latest arrivals',
          status: 'published',
        })
        .expect(201);

      expect(response.body.status).toBe('published');
    });

    it('followers should receive news notifications', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('NewsNotificationLog');
      const notifications = await notificationRepo.find({
        where: { userId: customer.user.id },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Monitoring', () => {
    let store: any;

    beforeAll(async () => {
      store = await seeder.seedStore(storeOwner.user);
      const products = await seeder.seedProducts(store, 2);

      // Simulate activity
      for (const product of products) {
        await authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/products/${product.id}`)
          .expect(200);

        await authHelper
          .authenticatedRequest(customer.accessToken)
          .post(`/products/${product.id}/like`)
          .expect(201);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should view store analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/quick-stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should view product performance', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/products/top`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should view conversion metrics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/conversion`)
        .expect(200);

      expect(response.body).toHaveProperty('conversionRate');
    });
  });
});
