import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { UserModule } from 'src/modules/user/user.module';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CartModule } from 'src/modules/store/cart/cart.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';

/**
 * User Lifecycle Integration Test
 *
 * Tests complete user journey from registration to active customer:
 * 1. User registration
 * 2. Email verification
 * 3. Profile setup
 * 4. First store follow
 * 5. First product like
 * 6. First purchase
 * 7. First review
 * 8. Preferences and settings
 * 9. Notification preferences
 * 10. Account management
 */
describe('Integration - User Lifecycle (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let store: any;
  let products: any[];

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        AuthModule,
        UserModule,
        StoreModule,
        ProductsModule,
        CartModule,
        OrdersModule,
        ReviewsModule,
        NotificationsModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Setup store with products
    storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    products = await seeder.seedProducts(store, 5);

    for (const product of products) {
      await seeder.seedVariants(product, 2);
    }
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Complete User Journey', () => {
    let newUser: any;

    it('Step 1: User registers account', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('newuser@example.com');

      newUser = response.body;
    });

    it('Step 2: Email verification initiated', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check verification email was queued
      const emailRepo = appHelper
        .getDataSource()
        .getRepository('EmailNotificationLog');
      const emails = await emailRepo.find({
        where: {
          recipientEmail: 'newuser@example.com',
          type: 'EMAIL_VERIFICATION',
        },
      });

      expect(emails.length).toBeGreaterThan(0);
    });

    it('Step 3: User completes profile', async () => {
      const response = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .patch(`/users/${newUser.user.id}`)
        .send({
          bio: 'I love shopping for quality products',
          phoneNumber: '+1234567890',
          preferences: {
            favoriteCategories: ['Electronics', 'Fashion'],
            priceRange: { min: 10, max: 500 },
          },
        })
        .expect(200);

      expect(response.body.bio).toBeDefined();
      expect(response.body.preferences).toMatchObject({
        favoriteCategories: ['Electronics', 'Fashion'],
      });
    });

    it('Step 4: User discovers and follows store', async () => {
      // Browse stores
      const storesResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get('/stores')
        .expect(200);

      expect(storesResponse.body.data.length).toBeGreaterThan(0);

      // Follow store
      await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post(`/stores/${store.id}/follow`)
        .expect(201);

      // Verify following
      const storeResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get(`/stores/${store.id}`)
        .expect(200);

      expect(storeResponse.body.isFollowing).toBe(true);
    });

    it('Step 5: User browses products', async () => {
      const response = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get('/products')
        .query({ storeId: store.id })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);

      // Analytics should track views
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('Step 6: User likes products', async () => {
      const product = products[0];

      await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post(`/products/${product.id}/like`)
        .expect(201);

      // View liked products
      const likesResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get(`/users/${newUser.user.id}/likes`)
        .expect(200);

      expect(likesResponse.body.data.length).toBe(1);
      expect(likesResponse.body.data[0].productId).toBe(product.id);
    });

    it('Step 7: User makes first purchase', async () => {
      const product = products[0];
      const variant = product.variants[0];

      // Set inventory
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 });

      // Create cart
      const cartResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post('/cart')
        .send({ userId: newUser.user.id })
        .expect(201);

      // Add item
      await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post(`/cart/${cartResponse.body.id}/items`)
        .send({
          productId: product.id,
          variantId: variant.id,
          quantity: 1,
        })
        .expect(201);

      // Place order
      const orderResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post('/orders')
        .send({
          cartId: cartResponse.body.id,
          shippingAddress: {
            name: 'John Doe',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body.userId).toBe(newUser.user.id);
    });

    it('Step 8: Order confirmation received', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check notification
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const notifications = await notificationRepo.find({
        where: { recipientUserId: newUser.user.id },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some((n) => n.type === 'ORDER_CONFIRMATION')).toBe(
        true
      );
    });

    it('Step 9: User leaves first review', async () => {
      // Simulate order delivery
      const ordersResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get('/orders')
        .expect(200);

      const order = ordersResponse.body.data[0];

      // Update order status
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({ status: 'DELIVERED' })
        .expect(200);

      // Leave review
      const product = products[0];
      const reviewResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .post(`/products/${product.id}/reviews`)
        .send({
          rating: 5,
          comment: 'Great product! Exceeded my expectations.',
        })
        .expect(201);

      expect(reviewResponse.body.rating).toBe(5);
    });

    it('Step 10: User updates notification preferences', async () => {
      const response = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .patch(`/users/${newUser.user.id}/preferences`)
        .send({
          notifications: {
            email: true,
            orderUpdates: true,
            newsUpdates: true,
            restockAlerts: true,
            promotions: false,
          },
        })
        .expect(200);

      expect(response.body.preferences.notifications).toMatchObject({
        email: true,
        orderUpdates: true,
      });
    });

    it('Step 11: User views activity history', async () => {
      // View orders
      const ordersResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get('/orders')
        .expect(200);

      expect(ordersResponse.body.data.length).toBeGreaterThan(0);

      // View reviews
      const reviewsResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get(`/users/${newUser.user.id}/reviews`)
        .expect(200);

      expect(reviewsResponse.body.data.length).toBeGreaterThan(0);

      // View liked products
      const likesResponse = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .get(`/users/${newUser.user.id}/likes`)
        .expect(200);

      expect(likesResponse.body.data.length).toBeGreaterThan(0);
    });

    it('Step 12: User updates password', async () => {
      const response = await authHelper
        .authenticatedRequest(newUser.accessToken)
        .patch(`/users/${newUser.user.id}/password`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Step 13: User can login with new password', async () => {
      const response = await appHelper
        .request()
        .post('/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'NewSecurePass456!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('User Engagement Patterns', () => {
    let engagedUser: any;

    beforeAll(async () => {
      engagedUser = await authHelper.createAuthenticatedUser();
    });

    it('should track user engagement over time', async () => {
      // Multiple activities
      await authHelper
        .authenticatedRequest(engagedUser.accessToken)
        .post(`/stores/${store.id}/follow`)
        .expect(201);

      for (const product of products.slice(0, 3)) {
        await authHelper
          .authenticatedRequest(engagedUser.accessToken)
          .get(`/products/${product.id}`)
          .expect(200);

        await authHelper
          .authenticatedRequest(engagedUser.accessToken)
          .post(`/products/${product.id}/like`)
          .expect(201);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check analytics
      const analyticsRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await analyticsRepo.find({
        where: { userId: engagedUser.user.id },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
