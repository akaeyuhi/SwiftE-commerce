import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { UserModule } from 'src/modules/user/user.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { CartModule } from 'src/modules/store/cart/cart.module';

/**
 * Inventory Management Integration Test
 *
 * Tests comprehensive inventory scenarios:
 * 1. Initial inventory setup
 * 2. Stock updates and tracking
 * 3. Low stock alerts
 * 4. Out of stock handling
 * 5. Order fulfillment impact
 * 6. Restock notifications
 * 7. Multi-variant inventory
 * 8. Inventory reservations
 * 9. Analytics integration
 */
describe('Integration - Inventory Management (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let customer1: any;
  let customer2: any;

  let store: any;
  let product: any;
  let variants: any[];

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
        NotificationsModule,
        AnalyticsModule,
      ],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Setup users
    storeOwner = await authHelper.createAuthenticatedUser();
    customer1 = await authHelper.createAuthenticatedUser();
    customer2 = await authHelper.createAuthenticatedUser();

    // Setup store and products
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];

    // Create multiple variants
    variants = await seeder.seedVariants(product, 3);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('Initial Inventory Setup', () => {
    it('should set initial inventory for all variants', async () => {
      // Set inventory for each variant
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const quantity = (i + 1) * 50; // 50, 100, 150

        const response = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(
            `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
          )
          .send({ quantity })
          .expect(200);

        expect(response.body.quantity).toBe(quantity);
      }

      // Verify all inventory records created
      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventories = await inventoryRepo.find({
        where: { variantId: variants.map((v) => v.id) },
      });

      expect(inventories.length).toBe(3);
    });

    it('should set low stock threshold', async () => {
      const variant = variants[0];

      // Set inventory with threshold
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({
          quantity: 100,
          lowStockThreshold: 20,
        })
        .expect(200);

      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventory = await inventoryRepo.findOne({
        where: { variantId: variant.id },
      });

      expect(inventory?.lowStockThreshold).toBe(20);
    });
  });

  describe('Stock Updates and Tracking', () => {
    beforeEach(async () => {
      // Reset inventory
      const variant = variants[0];
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 });
    });

    it('should track inventory adjustments', async () => {
      const variant = variants[0];

      // Simulate restocking
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 50 })
        .expect(200);

      // Verify new quantity
      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventory = await inventoryRepo.findOne({
        where: { variantId: variant.id },
      });

      expect(inventory?.quantity).toBe(150);
    });

    it('should track multiple adjustments', async () => {
      const variant = variants[0];

      // Multiple adjustments
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -10 })
        .expect(200);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -5 })
        .expect(200);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 20 })
        .expect(200);

      // Final quantity should be 100 - 10 - 5 + 20 = 105
      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventory = await inventoryRepo.findOne({
        where: { variantId: variant.id },
      });

      expect(inventory?.quantity).toBe(105);
    });

    it('should prevent negative inventory', async () => {
      const variant = variants[0];

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -150 }); // More than available

      expect(response.status).toBe(400);
    });
  });

  describe('Low Stock Alerts', () => {
    beforeEach(async () => {
      // Clear notifications
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      await notificationRepo.clear();
    });

    it('should trigger low stock alert when crossing threshold', async () => {
      const variant = variants[0];

      // Set inventory just above threshold
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({
          quantity: 25,
          lowStockThreshold: 20,
        });

      // Adjust to below threshold
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -10 })
        .expect(200);

      // Wait for notification processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify notification sent
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id, type: 'LOW_STOCK' },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should not send duplicate alerts', async () => {
      const variant = variants[0];

      // Set inventory below threshold
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({
          quantity: 15,
          lowStockThreshold: 20,
        });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Further reduce inventory (still below threshold)
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -5 })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should only have one notification
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id, type: 'LOW_STOCK' },
      });

      expect(notifications.length).toBe(1);
    });

    it('should notify store owner and moderators', async () => {
      const variant = variants[0];

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({
          quantity: 25,
          lowStockThreshold: 20,
        });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -10 })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check notification logs
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].recipientUserId).toBe(storeOwner.user.id);
    });
  });

  describe('Out of Stock Handling', () => {
    it('should mark product as out of stock', async () => {
      const variant = variants[0];

      // Set inventory to 0
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 0 })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check notification
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id, type: 'OUT_OF_STOCK' },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should prevent orders when out of stock', async () => {
      const variant = variants[0];

      // Set inventory to 0
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 0 });

      // Try to create cart with out of stock item
      const cartResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/cart')
        .send({ userId: customer1.user.id })
        .expect(201);

      const addItemResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/cart/${cartResponse.body.id}/items`)
        .send({
          productId: product.id,
          variantId: variant.id,
          quantity: 1,
        });

      expect(addItemResponse.status).toBe(400);
      expect(addItemResponse.body.message).toContain('out of stock');
    });

    it('should allow restock notifications signup', async () => {
      const variant = variants[0];

      // Set out of stock
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 0 });

      // Customer signs up for restock notification
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/products/${product.id}/variants/${variant.id}/notify-restock`)
        .expect(201);

      // Verify notification subscription created
      const subscriptionRepo = appHelper
        .getDataSource()
        .getRepository('RestockNotificationSubscription');
      const subscription = await subscriptionRepo.findOne({
        where: {
          variantId: variant.id,
          userId: customer1.user.id,
        },
      });

      expect(subscription).toBeDefined();
    });
  });

  describe('Order Fulfillment Impact', () => {
    beforeEach(async () => {
      // Set inventory
      const variant = variants[0];
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 50 });
    });

    it('should reserve inventory when order is placed', async () => {
      const variant = variants[0];

      // Create cart and add item
      const cartResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/cart')
        .send({ userId: customer1.user.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/cart/${cartResponse.body.id}/items`)
        .send({
          productId: product.id,
          variantId: variant.id,
          quantity: 5,
        })
        .expect(201);

      // Place order
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/orders')
        .send({
          cartId: cartResponse.body.id,
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

      // Check inventory was decremented
      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventory = await inventoryRepo.findOne({
        where: { variantId: variant.id },
      });

      expect(inventory?.quantity).toBe(45); // 50 - 5
    });

    it('should handle concurrent orders correctly', async () => {
      const variant = variants[0];

      // Two customers create carts simultaneously
      const [cart1Response, cart2Response] = await Promise.all([
        authHelper
          .authenticatedRequest(customer1.accessToken)
          .post('/cart')
          .send({ userId: customer1.user.id }),
        authHelper
          .authenticatedRequest(customer2.accessToken)
          .post('/cart')
          .send({ userId: customer2.user.id }),
      ]);

      // Both add same item
      await Promise.all([
        authHelper
          .authenticatedRequest(customer1.accessToken)
          .post(`/cart/${cart1Response.body.id}/items`)
          .send({
            productId: product.id,
            variantId: variant.id,
            quantity: 30,
          }),
        authHelper
          .authenticatedRequest(customer2.accessToken)
          .post(`/cart/${cart2Response.body.id}/items`)
          .send({
            productId: product.id,
            variantId: variant.id,
            quantity: 25,
          }),
      ]);

      // First order should succeed
      const order1 = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/orders')
        .send({
          cartId: cart1Response.body.id,
          shippingAddress: {
            name: 'Customer 1',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        });

      expect(order1.status).toBe(201);

      // Second order should fail (insufficient inventory)
      const order2 = await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post('/orders')
        .send({
          cartId: cart2Response.body.id,
          shippingAddress: {
            name: 'Customer 2',
            address: '456 Oak Ave',
            city: 'NYC',
            state: 'NY',
            zipCode: '10002',
            country: 'USA',
          },
        });

      expect(order2.status).toBe(400);
      expect(order2.body.message).toContain('insufficient inventory');
    });

    it('should restore inventory on order cancellation', async () => {
      const variant = variants[0];

      // Create and place order
      const cartResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/cart')
        .send({ userId: customer1.user.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/cart/${cartResponse.body.id}/items`)
        .send({
          productId: product.id,
          variantId: variant.id,
          quantity: 10,
        })
        .expect(201);

      const orderResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/orders')
        .send({
          cartId: cartResponse.body.id,
          shippingAddress: {
            name: 'Test',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      const inventoryBefore = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      // Cancel order
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(`/orders/${orderResponse.body.id}/status`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      // Check inventory restored
      const inventoryAfter = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      const variantBefore = inventoryBefore.body.find(
        (v: any) => v.id === variant.id
      );
      const variantAfter = inventoryAfter.body.find(
        (v: any) => v.id === variant.id
      );

      expect(variantAfter.inventory.quantity).toBe(
        variantBefore.inventory.quantity + 10
      );
    });
  });

  describe('Restock Notifications', () => {
    beforeEach(async () => {
      // Clear subscriptions
      const subscriptionRepo = appHelper
        .getDataSource()
        .getRepository('RestockNotificationSubscription');
      await subscriptionRepo.clear();
    });

    it('should notify subscribers when item is restocked', async () => {
      const variant = variants[0];

      // Set out of stock
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 0 });

      // Customers subscribe
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/products/${product.id}/variants/${variant.id}/notify-restock`)
        .expect(201);

      await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post(`/products/${product.id}/variants/${variant.id}/notify-restock`)
        .expect(201);

      // Restock item
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 50 })
        .expect(200);

      // Wait for notifications
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check notifications sent
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('RestockNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id },
      });

      expect(notifications.length).toBe(2);

      const recipients = notifications.map((n) => n.recipientUserId);
      expect(recipients).toContain(customer1.user.id);
      expect(recipients).toContain(customer2.user.id);
    });

    it('should remove subscriptions after notification', async () => {
      const variant = variants[0];

      // Set out of stock
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 0 });

      // Subscribe
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/products/${product.id}/variants/${variant.id}/notify-restock`)
        .expect(201);

      // Restock
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 50 })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check subscription removed
      const subscriptionRepo = appHelper
        .getDataSource()
        .getRepository('RestockNotificationSubscription');
      const subscription = await subscriptionRepo.findOne({
        where: {
          variantId: variant.id,
          userId: customer1.user.id,
        },
      });

      expect(subscription).toBeNull();
    });
  });

  describe('Multi-Variant Inventory', () => {
    it('should manage inventory independently per variant', async () => {
      // Set different inventory for each variant
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variants[0].id}/inventory`
        )
        .send({ quantity: 100 });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variants[1].id}/inventory`
        )
        .send({ quantity: 50 });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variants[2].id}/inventory`
        )
        .send({ quantity: 25 });

      // Verify independent inventory
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      expect(response.body[0].inventory.quantity).toBe(100);
      expect(response.body[1].inventory.quantity).toBe(50);
      expect(response.body[2].inventory.quantity).toBe(25);
    });

    it('should handle orders with multiple variants', async () => {
      // Set inventory
      for (const variant of variants) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(
            `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
          )
          .send({ quantity: 50 });
      }

      // Create cart with multiple variants
      const cartResponse = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/cart')
        .send({ userId: customer1.user.id })
        .expect(201);

      for (const variant of variants) {
        await authHelper
          .authenticatedRequest(customer1.accessToken)
          .post(`/cart/${cartResponse.body.id}/items`)
          .send({
            productId: product.id,
            variantId: variant.id,
            quantity: 2,
          })
          .expect(201);
      }

      // Place order
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post('/orders')
        .send({
          cartId: cartResponse.body.id,
          shippingAddress: {
            name: 'Test',
            address: '123 Main St',
            city: 'NYC',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      // Verify all variants decremented
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      response.body.forEach((variant: any) => {
        expect(variant.inventory.quantity).toBe(48); // 50 - 2
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track inventory events in analytics', async () => {
      const variant = variants[0];

      // Perform inventory operations
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -20 });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check analytics events
      const analyticsRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await analyticsRepo.find({
        where: {
          storeId: store.id,
          eventType: 'INVENTORY_ADJUSTMENT',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should update store inventory metrics', async () => {
      // Perform several inventory operations
      for (const variant of variants) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(
            `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
          )
          .send({ quantity: 100 });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check store analytics
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/analytics/stores/${store.id}/quick-stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalInventoryValue');
      expect(response.body.totalInventoryValue).toBeGreaterThan(0);
    });
  });
});
