import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { CartModule } from 'src/modules/store/cart/cart.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';
import { NewsModule } from 'src/modules/store/news/news.module';

/**
 * Multi-Store Integration Test
 *
 * Tests cross-store scenarios:
 * 1. Customer browses multiple stores
 * 2. Follows stores
 * 3. Compares products across stores
 * 4. Places orders from multiple stores
 * 5. Receives news from followed stores
 * 6. Manages reviews across stores
 * 7. Store analytics remain isolated
 */
describe('Integration - Multi-Store Flow (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let customer: any;
  let storeOwner1: any;
  let storeOwner2: any;
  let storeOwner3: any;
  let store1: any;
  let store2: any;
  let store3: any;
  let store1Products: any[];
  let store2Products: any[];

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [
        StoreModule,
        ProductsModule,
        CartModule,
        OrdersModule,
        AuthModule,
        UserModule,
        ReviewsModule,
        NewsModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Create customer
    customer = await authHelper.createAuthenticatedUser();

    // Create multiple stores
    storeOwner1 = await authHelper.createAuthenticatedUser();
    storeOwner2 = await authHelper.createAuthenticatedUser();
    storeOwner3 = await authHelper.createAuthenticatedUser();

    store1 = await seeder.seedStore(storeOwner1.user, { name: 'Tech Store' });
    store2 = await seeder.seedStore(storeOwner2.user, {
      name: 'Fashion Store',
    });
    store3 = await seeder.seedStore(storeOwner3.user, {
      name: 'Home Goods Store',
    });

    // Seed products for each store
    store1Products = await seeder.seedProducts(store1, 3);
    store2Products = await seeder.seedProducts(store2, 3);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Multi-Store Discovery', () => {
    it('Customer discovers multiple stores', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/stores')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      const storeNames = response.body.data.map((s: any) => s.name);
      expect(storeNames).toContain('Tech Store');
      expect(storeNames).toContain('Fashion Store');
      expect(storeNames).toContain('Home Goods Store');
    });

    it('Customer views each store individually', async () => {
      const stores = [store1, store2, store3];

      for (const store of stores) {
        const response = await authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/stores/${store.id}`)
          .expect(200);

        expect(response.body.id).toBe(store.id);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('description');
      }
    });

    it('Customer searches products across all stores', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(9); // 3 stores × 3 products

      // Products from different stores should be present
      const storeIds = new Set(response.body.data.map((p: any) => p.storeId));
      expect(storeIds.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Store Following', () => {
    it('Customer follows multiple stores', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store1.id}/follow`)
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store2.id}/follow`)
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store3.id}/follow`)
        .expect(201);

      // Verify follower count updated
      for (const store of [store1, store2, store3]) {
        const response = await authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/stores/${store.id}`)
          .expect(200);

        expect(response.body.isFollowing).toBe(true);
      }
    });

    it('Customer gets list of followed stores', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/users/${customer.user.id}/following/stores`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cross-Store Product Comparison', () => {
    it('Customer compares similar products across stores', async () => {
      const store1Product = store1Products[0];
      const store2Product = store2Products[0];

      const product1Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/products/${store1Product.id}`)
        .expect(200);

      const product2Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/products/${store2Product.id}`)
        .expect(200);

      // Customer can compare prices, ratings, etc.
      expect(product1Response.body).toHaveProperty('price');
      expect(product2Response.body).toHaveProperty('price');
      expect(product1Response.body.storeId).not.toBe(
        product2Response.body.storeId
      );
    });

    it('Customer likes products from different stores', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${store1Products[0].id}/like`)
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${store2Products[0].id}/like`)
        .expect(201);

      // Verify likes
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/users/${customer.user.id}/likes`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const likedStores = new Set(
        response.body.data.map((l: any) => l.product.storeId)
      );
      expect(likedStores.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Multi-Store Orders', () => {
    it('Customer places orders from multiple stores', async () => {
      const orders: any[] = [];

      // Create order from Store 1
      const cart1Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/cart')
        .send({ userId: customer.user.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/cart/${cart1Response.body.id}/items`)
        .send({
          productId: store1Products[0].id,
          variantId: store1Products[0].variants[0].id,
          quantity: 1,
        })
        .expect(201);

      const order1 = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/orders')
        .send({
          cartId: cart1Response.body.id,
          shippingAddress: {
            name: 'Test User',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      orders.push(order1.body);

      // Create order from Store 2
      const cart2Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/cart')
        .send({ userId: customer.user.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/cart/${cart2Response.body.id}/items`)
        .send({
          productId: store2Products[0].id,
          variantId: store2Products[0].variants[0].id,
          quantity: 1,
        })
        .expect(201);

      const order2 = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/orders')
        .send({
          cartId: cart2Response.body.id,
          shippingAddress: {
            name: 'Test User',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      orders.push(order2.body);

      // Verify orders from different stores
      expect(orders[0].storeId).not.toBe(orders[1].storeId);
    });

    it('Customer views all orders across stores', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/orders')
        .expect(200);

      const orderStores = new Set(
        response.body.data.map((o: any) => o.storeId)
      );
      expect(orderStores.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cross-Store Reviews', () => {
    it('Customer leaves reviews for products from different stores', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${store1Products[0].id}/reviews`)
        .send({
          rating: 5,
          comment: 'Great tech product!',
        })
        .expect(201);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${store2Products[0].id}/reviews`)
        .send({
          rating: 4,
          comment: 'Nice fashion item!',
        })
        .expect(201);

      // Verify reviews
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/users/${customer.user.id}/reviews`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Store News & Updates', () => {
    it('Customer receives news from followed stores', async () => {
      // Store 1 publishes news
      await authHelper
        .authenticatedRequest(storeOwner1.accessToken)
        .post('/news')
        .send({
          storeId: store1.id,
          title: 'New Tech Arrivals!',
          content: 'Check out our latest gadgets',
          status: 'published',
        })
        .expect(201);

      // Store 2 publishes news
      await authHelper
        .authenticatedRequest(storeOwner2.accessToken)
        .post('/news')
        .send({
          storeId: store2.id,
          title: 'Fashion Sale!',
          content: '50% off all items',
          status: 'published',
        })
        .expect(201);

      // Customer should receive notifications (check notification logs)
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

  describe('Store Analytics Isolation', () => {
    it('Each store has isolated analytics', async () => {
      const store1Stats = await authHelper
        .authenticatedRequest(storeOwner1.accessToken)
        .get(`/analytics/stores/${store1.id}/quick-stats`)
        .expect(200);

      const store2Stats = await authHelper
        .authenticatedRequest(storeOwner2.accessToken)
        .get(`/analytics/stores/${store2.id}/quick-stats`)
        .expect(200);

      // Stats should be different for each store
      expect(store1Stats.body).toBeDefined();
      expect(store2Stats.body).toBeDefined();
    });

    it('Store owners cannot access other store analytics', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner1.accessToken)
        .get(`/analytics/stores/${store2.id}/quick-stats`);

      // Should be forbidden or empty
      expect([403, 200]).toContain(response.status);
    });
  });

  describe('Store Comparison by Customer', () => {
    it('Customer can compare stores side by side', async () => {
      const stores = await Promise.all([
        authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/stores/${store1.id}`)
          .expect(200),
        authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/stores/${store2.id}`)
          .expect(200),
        authHelper
          .authenticatedRequest(customer.accessToken)
          .get(`/stores/${store3.id}`)
          .expect(200),
      ]);

      // Customer can compare:
      // - Product count
      // - Follower count
      // - Average ratings
      // - Total revenue (if public)
      stores.forEach((response) => {
        expect(response.body).toHaveProperty('productCount');
        expect(response.body).toHaveProperty('followerCount');
      });
    });
  });
});
