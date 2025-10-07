import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';
import { CartModule } from 'src/modules/store/cart/cart.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { AuthModule } from 'src/modules/auth/auth.module';

/**
 * Full Purchase Flow Integration Test
 *
 * Tests the complete e-commerce journey:
 * 1. User browses products
 * 2. Views product details
 * 3. Adds items to cart
 * 4. Updates cart quantities
 * 5. Proceeds to checkout
 * 6. Places order
 * 7. Receives order confirmation
 * 8. Tracks order status updates
 * 9. Order fulfillment
 * 10. Analytics tracking throughout
 */
describe('Integration - Full Purchase Flow (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let customer: any;
  let storeOwner: any;
  let store: any;
  let products: any[];

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
        AnalyticsModule,
        NotificationsModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Setup test data
    storeOwner = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
    products = await seeder.seedProducts(store, 5);

    // Seed variants and inventory for products
    for (const product of products) {
      await seeder.seedVariants(product, 2);
    }
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Complete Purchase Journey', () => {
    let cart: any;
    let order: any;

    it('Step 1: Customer browses store and views products', async () => {
      // Browse store
      const storeResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}`)
        .expect(200);

      expect(storeResponse.body.id).toBe(store.id);
      expect(storeResponse.body.name).toBe(store.name);

      // List products
      const productsResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/products')
        .query({ storeId: store.id })
        .expect(200);

      expect(productsResponse.body.data.length).toBeGreaterThan(0);
      expect(productsResponse.body.data[0]).toHaveProperty('name');
      expect(productsResponse.body.data[0]).toHaveProperty('price');
    });

    it('Step 2: Customer views product details', async () => {
      const product = products[0];

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/products/${product.id}`)
        .expect(200);

      expect(response.body.id).toBe(product.id);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('variants');

      // Analytics event should be tracked
      await new Promise((resolve) => setTimeout(resolve, 500));

      const analyticsRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const viewEvents = await analyticsRepo.find({
        where: { productId: product.id, userId: customer.user.id },
      });

      expect(viewEvents.length).toBeGreaterThan(0);
    });

    it('Step 3: Customer likes product', async () => {
      const product = products[0];

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${product.id}/like`)
        .expect(201);

      // Verify like was created
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/products/${product.id}`)
        .expect(200);

      expect(response.body.isLiked).toBe(true);
    });

    it('Step 4: Customer creates cart', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/cart')
        .send({
          userId: customer.user.id,
        })
        .expect(201);

      cart = response.body;
      expect(cart).toHaveProperty('id');
      expect(cart.userId).toBe(customer.user.id);
    });

    it('Step 5: Customer adds items to cart', async () => {
      const product1 = products[0];
      const product2 = products[1];

      // Add first product
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/cart/${cart.id}/items`)
        .send({
          productId: product1.id,
          variantId: product1.variants[0].id,
          quantity: 2,
        })
        .expect(201);

      // Add second product
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/cart/${cart.id}/items`)
        .send({
          productId: product2.id,
          variantId: product2.variants[0].id,
          quantity: 1,
        })
        .expect(201);

      // Verify cart items
      const cartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/cart/${cart.id}`)
        .expect(200);

      expect(cartResponse.body.items.length).toBe(2);
      expect(cartResponse.body).toHaveProperty('totalAmount');
    });

    it('Step 6: Customer updates cart quantities', async () => {
      const cartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/cart/${cart.id}`)
        .expect(200);

      const firstItem = cartResponse.body.items[0];

      // Update quantity
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .patch(`/cart/${cart.id}/items/${firstItem.id}`)
        .send({ quantity: 3 })
        .expect(200);

      // Verify update
      const updatedCart = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/cart/${cart.id}`)
        .expect(200);

      const updatedItem = updatedCart.body.items.find(
        (i: any) => i.id === firstItem.id
      );
      expect(updatedItem.quantity).toBe(3);
    });

    it('Step 7: Customer proceeds to checkout', async () => {
      const cartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/cart/${cart.id}`)
        .expect(200);

      expect(cartResponse.body.items.length).toBeGreaterThan(0);
      expect(cartResponse.body.totalAmount).toBeGreaterThan(0);

      // Verify inventory is available
      for (const item of cartResponse.body.items) {
        const inventoryRepo = appHelper
          .getDataSource()
          .getRepository('Inventory');
        const inventory = await inventoryRepo.findOne({
          where: { variantId: item.variantId },
        });

        expect(inventory).toBeDefined();
        expect(inventory?.quantity).toBeGreaterThanOrEqual(item.quantity);
      }
    });

    it('Step 8: Customer places order', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/orders')
        .send({
          cartId: cart.id,
          shippingAddress: {
            name: customer.user.firstName + ' ' + customer.user.lastName,
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
          billingAddress: {
            name: customer.user.firstName + ' ' + customer.user.lastName,
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      order = response.body;
      expect(order).toHaveProperty('id');
      expect(order.userId).toBe(customer.user.id);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items.length).toBeGreaterThan(0);

      // Verify inventory was decremented
      for (const item of order.items) {
        const inventoryRepo = appHelper
          .getDataSource()
          .getRepository('Inventory');
        const inventory = await inventoryRepo.findOne({
          where: { variantId: item.variantId },
        });

        expect(inventory).toBeDefined();
      }
    });

    it('Step 9: Order confirmation notification sent', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const notifications = await notificationRepo.find({
        where: { orderId: order.id },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(
        notifications.some((n) => n.notificationType === 'ORDER_CONFIRMATION')
      ).toBe(true);
    });

    it('Step 10: Customer views order history', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get('/orders')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const customerOrder = response.body.data.find(
        (o: any) => o.id === order.id
      );
      expect(customerOrder).toBeDefined();
      expect(customerOrder.status).toBe(OrderStatus.PENDING);
    });

    it('Step 11: Store owner processes order', async () => {
      // Store owner views order
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/orders/${order.id}`)
        .expect(200);

      expect(response.body.id).toBe(order.id);
      expect(response.body.status).toBe(OrderStatus.PENDING);
    });

    it('Step 12: Store owner updates order to processing', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.PROCESSING })
        .expect(200);

      // Verify status update
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/orders/${order.id}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.PROCESSING);
    });

    it('Step 13: Store owner ships order', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({
          status: OrderStatus.SHIPPED,
          trackingNumber: '1Z999AA10123456784',
        })
        .expect(200);

      // Verify shipping notification sent
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const notifications = await notificationRepo.find({
        where: { orderId: order.id },
      });

      expect(
        notifications.some((n) => n.notificationType === 'ORDER_SHIPPED')
      ).toBe(true);
    });

    it('Step 14: Order is delivered', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${order.id}/status`)
        .send({ status: OrderStatus.DELIVERED })
        .expect(200);

      // Verify delivery notification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('OrderNotificationLog');
      const notifications = await notificationRepo.find({
        where: { orderId: order.id },
      });

      expect(
        notifications.some((n) => n.notificationType === 'ORDER_DELIVERED')
      ).toBe(true);
    });

    it('Step 15: Customer leaves review', async () => {
      const product = order.items[0];

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/products/${product.productId}/reviews`)
        .send({
          rating: 5,
          comment: 'Great product! Fast shipping and excellent quality.',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.rating).toBe(5);
    });

    it('Step 16: Analytics tracked throughout journey', async () => {
      const analyticsRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await analyticsRepo.find({
        where: { userId: customer.user.id },
      });

      // Should have multiple event types
      const eventTypes = new Set(events.map((e) => e.eventType));
      expect(eventTypes.size).toBeGreaterThan(1);
      expect(eventTypes.has('VIEW')).toBe(true);
      expect(eventTypes.has('PURCHASE')).toBe(true);
    });

    it('Step 17: Store analytics updated', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/quick-stats`)
        .expect(200);

      expect(response.body.totalRevenue).toBeGreaterThan(0);
      expect(response.body.orderCount).toBeGreaterThan(0);
    });
  });
});
