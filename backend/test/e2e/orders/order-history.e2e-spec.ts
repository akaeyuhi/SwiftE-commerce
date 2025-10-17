import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Orders - History (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let customer: any;

  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['orders']);
  });

  describe('GET /stores/:storeId/orders/all', () => {
    beforeEach(async () => {
      await seeder.seedOrders(store, customer.user, 3);
    });

    it('should list all store orders as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/all`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((order: any) => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('totalAmount');
        expect(order).toHaveProperty('items');
        expect(order.storeId).toBe(store.id);
        AssertionHelper.assertUUID(order.id);
        AssertionHelper.assertTimestamps(order);
      });
    });

    it('should include order items', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/all`)
        .expect(200);

      response.body.forEach((order: any) => {
        expect(Array.isArray(order.items)).toBe(true);
        expect(order.items.length).toBeGreaterThan(0);
      });
    });

    it('should include user information', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/all`)
        .expect(200);

      response.body.forEach((order: any) => {
        expect(order).toHaveProperty('userId');
        expect(order.userId).toBe(customer.user.id);
      });
    });

    it('should prevent regular user from listing all orders', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/all`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/stores/${store.id}/orders/all`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return empty array for store with no orders', async () => {
      await appHelper.clearTable('orders');

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/all`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should sort orders by creation date', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/all`)
        .expect(200);

      for (let i = 1; i < response.body.length; i++) {
        const prev = new Date(response.body[i - 1].createdAt);
        const current = new Date(response.body[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(current.getTime());
      }
    });
  });

  describe('GET /stores/:storeId/orders/:id', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should get order by id as owner', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.id).toBe(order.id);
      expect(response.body.userId).toBe(customer.user.id);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('shipping');
      expect(response.body).toHaveProperty('totalAmount');
    });

    it('should get order as store admin', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.id).toBe(order.id);
    });

    it('should get order as site admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.id).toBe(order.id);
    });

    it('should prevent other users from viewing order', async () => {
      const otherCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(otherCustomer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/00000000-0000-0000-0000-000000000000`);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/invalid-uuid`);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should include complete shipping information', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.shipping).toBeDefined();
      expect(response.body.shipping).toHaveProperty('firstName');
      expect(response.body.shipping).toHaveProperty('lastName');
      expect(response.body.shipping).toHaveProperty('addressLine1');
      expect(response.body.shipping).toHaveProperty('city');
      expect(response.body.shipping).toHaveProperty('postalCode');
      expect(response.body.shipping).toHaveProperty('country');
    });

    it('should include all order items with details', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);

      response.body.items.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('variantId');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('unitPrice');
        expect(item).toHaveProperty('quantity');
      });
    });
  });

  describe('GET /stores/:storeId/orders/user/:userId', () => {
    beforeEach(async () => {
      await seeder.seedOrders(store, customer.user, 3);
    });

    it('should get all orders for user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/user/${customer.user.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((order: any) => {
        expect(order.userId).toBe(customer.user.id);
        expect(order).toHaveProperty('items');
        expect(order).toHaveProperty('totalAmount');
      });
    });

    it('should filter by store', async () => {
      const store2 = await seeder.seedStore(storeOwner.user);
      await seeder.seedOrders(store2, customer.user, 2);

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/user/${customer.user.id}`)
        .expect(200);

      // Should only return orders from store, not store2
      expect(response.body.length).toBe(3);
      response.body.forEach((order: any) => {
        expect(order.storeId).toBe(store.id);
      });
    });

    it('should prevent accessing other user orders', async () => {
      const otherCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/user/${otherCustomer.user.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow store admin to view any user orders', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/user/${customer.user.id}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow site admin to view any user orders', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/orders/user/${customer.user.id}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no orders', async () => {
      const newCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(newCustomer.accessToken)
        .get(`/stores/${store.id}/orders/user/${newCustomer.user.id}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should validate user UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/user/invalid-uuid`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('GET /stores/:storeId/orders/:id/inventory-impact', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should return inventory impact summary', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}/inventory-impact`)
        .expect(200);

      expect(response.body).toHaveProperty('totalItems');
      expect(response.body).toHaveProperty('totalUnits');
      expect(response.body).toHaveProperty('itemsWithInventory');
      expect(response.body).toHaveProperty('estimatedValue');

      expect(typeof response.body.totalItems).toBe('number');
      expect(typeof response.body.totalUnits).toBe('number');
      expect(typeof response.body.estimatedValue).toBe('number');
    });

    it('should prevent regular user access', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}/inventory-impact`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow site admin access', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}/inventory-impact`)
        .expect(200);

      expect(response.body).toHaveProperty('totalItems');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with orders in multiple stores', async () => {
      const store2 = await seeder.seedStore(storeOwner.user);

      await seeder.seedOrders(store, customer.user, 2);
      await seeder.seedOrders(store2, customer.user, 3);

      const store1Orders = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/user/${customer.user.id}`)
        .expect(200);

      const store2Orders = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store2.id}/orders/user/${customer.user.id}`)
        .expect(200);

      expect(store1Orders.body.length).toBe(2);
      expect(store2Orders.body.length).toBe(3);
    });

    it('should handle orders with many items', async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      const order = orders[0];

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
    });
  });
});
