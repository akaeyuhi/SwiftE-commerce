import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Cart - Operations (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let customer: any;
  let store: any;
  let product: any;
  let variants: any[];

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    customer = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(adminUser.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
    variants = await seeder.seedVariants(product, 2);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['shopping_carts', 'cart-items']);
  });

  describe('POST /stores/:storeId/:userId/cart/get-or-create', () => {
    it('should create cart for user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(customer.user.id);
      expect(response.body.storeId).toBe(store.id);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should return existing cart if already created', async () => {
      // Create cart first time
      const firstResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`)
        .expect(201);

      // Call again
      const secondResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`)
        .expect(201);

      expect(secondResponse.body.id).toBe(firstResponse.body.id);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate user UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/invalid-uuid/cart/get-or-create`);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/invalid-uuid/${customer.user.id}/cart/get-or-create`);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should create separate carts for different stores', async () => {
      const store2 = await seeder.seedStore(adminUser.user);

      const cart1Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`)
        .expect(201);

      const cart2Response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store2.id}/${customer.user.id}/cart/get-or-create`)
        .expect(201);

      expect(cart1Response.body.id).not.toBe(cart2Response.body.id);
      expect(cart1Response.body.storeId).toBe(store.id);
      expect(cart2Response.body.storeId).toBe(store2.id);
    });
  });

  describe('GET /stores/:storeId/:userId/cart/user-cart', () => {
    let cart: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);
      cart = response.body;
    });

    it('should get existing cart', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/user-cart`)
        .expect(200);

      expect(response.body.id).toBe(cart.id);
      expect(response.body.userId).toBe(customer.user.id);
      expect(response.body.storeId).toBe(store.id);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/stores/${store.id}/${customer.user.id}/cart/user-cart`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return 404 when cart does not exist', async () => {
      const newCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(newCustomer.accessToken)
        .get(`/stores/${store.id}/${newCustomer.user.id}/cart/user-cart`);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should include cart items if any', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/user-cart`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('GET /stores/:storeId/:userId/cart/merged', () => {
    beforeEach(async () => {
      // Create carts in multiple stores
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);

      const store2 = await seeder.seedStore(adminUser.user);
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store2.id}/${customer.user.id}/cart/get-or-create`);
    });

    it('should return all user carts across stores', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/merged`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      response.body.forEach((cart: any) => {
        expect(cart.userId).toBe(customer.user.id);
        expect(cart).toHaveProperty('storeId');
        expect(cart).toHaveProperty('store');
      });
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/stores/${store.id}/${customer.user.id}/cart/merged`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return empty array for user with no carts', async () => {
      const newCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(newCustomer.accessToken)
        .get(`/stores/${store.id}/${newCustomer.user.id}/cart/merged`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include store information', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/merged`)
        .expect(200);

      response.body.forEach((cart: any) => {
        expect(cart.store).toBeDefined();
        expect(cart.store).toHaveProperty('id');
        expect(cart.store).toHaveProperty('name');
      });
    });
  });

  describe('DELETE /stores/:storeId/:userId/cart/clear', () => {
    let cart: any;

    beforeEach(async () => {
      const cartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);
      cart = cartResponse.body;

      // Add some items
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/add`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });
    });

    it('should clear all items from cart', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart/clear`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify items are cleared
      const cartItemRepo = appHelper.getDataSource().getRepository('CartItem');
      const items = await cartItemRepo.find({
        where: { cart: { id: cart.id } },
      });
      expect(items.length).toBe(0);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart/clear`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle cart with no items gracefully', async () => {
      // Clear items first
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart/clear`);

      // Clear again
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart/clear`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should preserve cart structure after clearing', async () => {
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart/clear`);

      // Cart should still exist
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/user-cart`)
        .expect(200);

      expect(response.body.id).toBe(cart.id);
    });
  });

  describe('DELETE /stores/:storeId/:userId/cart', () => {
    let cart: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);
      cart = response.body;
    });

    it('should delete entire cart', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify cart is deleted
      const cartRepo = appHelper.getDataSource().getRepository('ShoppingCart');
      const deletedCart = await cartRepo.findOne({ where: { id: cart.id } });
      expect(deletedCart).toBeNull();
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle non-existent cart gracefully', async () => {
      const newCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${newCustomer.user.id}/cart`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should cascade delete cart items', async () => {
      // Add items to cart
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/add`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      // Delete cart
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/stores/${store.id}/${customer.user.id}/cart`)
        .expect(200);

      // Verify items are also deleted
      const cartItemRepo = appHelper.getDataSource().getRepository('CartItem');
      const items = await cartItemRepo.find({
        where: { cart: { id: cart.id } },
      });
      expect(items.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent cart creation', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() =>
          authHelper
            .authenticatedRequest(customer.accessToken)
            .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`)
        );

      const responses = await Promise.all(requests);

      // All should return the same cart ID
      const cartIds = responses.map((r) => r.body.id);
      const uniqueIds = [...new Set(cartIds)];
      expect(uniqueIds.length).toBe(1);
    });

    it('should prevent user from accessing other user carts', async () => {
      const otherCustomer = await authHelper.createAuthenticatedUser();

      await authHelper
        .authenticatedRequest(otherCustomer.accessToken)
        .post(
          `/stores/${store.id}/${otherCustomer.user.id}/cart/get-or-create`
        );

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${otherCustomer.user.id}/cart/user-cart`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle cart for non-existent store', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/00000000-0000-0000-0000-000000000000/${customer.user.id}/cart/get-or-create`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should maintain separate carts per store', async () => {
      const store2 = await seeder.seedStore(adminUser.user);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store2.id}/${customer.user.id}/cart/get-or-create`);

      const mergedResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/merged`)
        .expect(200);

      expect(mergedResponse.body.length).toBe(2);
      const storeIds = mergedResponse.body.map((cart: any) => cart.storeId);
      expect(storeIds).toContain(store.id);
      expect(storeIds).toContain(store2.id);
    });
  });
});
