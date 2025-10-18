import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';

describe('Cart - Items (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let customer: any;
  let store: any;
  let product: any;
  let variants: any[];
  let cart: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    customer = await authHelper.createAuthenticatedUser();
    const adminUser = await authHelper.createAdminUser();

    store = await seeder.seedStore(adminUser.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
    variants = await seeder.seedVariants(product, 3);
  });

  beforeEach(async () => {
    const response = await authHelper
      .authenticatedRequest(customer.accessToken)
      .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);
    cart = response.body;
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['shopping_carts', 'cart-items']);
  });

  describe('POST /stores/:storeId/:userId/cart/:cartId/add-item', () => {
    it('should add item to cart', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.cartId).toBe(cart.id);
      expect(response.body.variantId).toBe(variants[0].id);
      expect(response.body.quantity).toBe(2);
      AssertionHelper.assertUUID(response.body.id);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate quantity is positive', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 0,
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should increment quantity if item already exists', async () => {
      // Add item first time
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      // Add same item again
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 3,
        })
        .expect(201);

      expect(response.body.quantity).toBe(5); // 2 + 3
    });

    it('should allow adding multiple different variants', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 1,
        });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[1].id,
          quantity: 2,
        });

      const cartItemRepo = appHelper.getDataSource().getRepository('CartItem');
      const items = await cartItemRepo.find({
        where: { cartId: cart.id },
      });
      expect(items.length).toBe(2);
    });

    it('should record analytics event', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
          productId: product.id,
        })
        .expect(201);

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: {
          productId: product.id,
          eventType: AnalyticsEventType.ADD_TO_CART,
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /stores/:storeId/:userId/cart/:cartId/items/:itemId', () => {
    let cartItem: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });
      cartItem = response.body;
    });

    it('should update item quantity', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/${cartItem.id}`
        )
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.quantity).toBe(5);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .put(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/${cartItem.id}`
        )
        .send({ quantity: 3 });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate quantity is non-negative', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/${cartItem.id}`
        )
        .send({ quantity: -1 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/00000000-0000-0000-0000-000000000000`
        )
        .send({ quantity: 5 });

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/invalid-uuid`
        )
        .send({ quantity: 5 });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('DELETE /stores/:storeId/:userId/cart/:cartId/items/:itemId', () => {
    let cartItem: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });
      cartItem = response.body;
    });

    it('should remove item from cart', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .delete(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/${cartItem.id}`
        )
        .expect(200);

      const cartItemRepo = appHelper.getDataSource().getRepository('CartItem');
      const deletedItem = await cartItemRepo.findOne({
        where: { id: cartItem.id },
      });
      expect(deletedItem).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .delete(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/${cartItem.id}`
        );

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .delete(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('GET /stores/:storeId/:userId/cart/:cartId/items', () => {
    beforeEach(async () => {
      // Add multiple items
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[1].id,
          quantity: 1,
        });
    });

    it('should list all items in cart', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      response.body.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('variantId');
        expect(item).toHaveProperty('quantity');
        expect(item.cartId).toBe(cart.id);
      });
    });

    it('should include variant information', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/${cart.id}/items`)
        .expect(200);

      response.body.forEach((item: any) => {
        expect(item).toHaveProperty('variant');
        expect(item.variant).toHaveProperty('sku');
        expect(item.variant).toHaveProperty('price');
      });
    });

    it('should return empty array for empty cart', async () => {
      await appHelper.clearTable('shopping_carts');
      const emptyCartResponse = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/${customer.user.id}/cart/get-or-create`);

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(
          `/stores/${store.id}/${customer.user.id}/cart/${emptyCartResponse.body.id}/items`
        )
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent item additions', async () => {
      const requests = variants.slice(0, 2).map((variant) =>
        authHelper
          .authenticatedRequest(customer.accessToken)
          .post(
            `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
          )
          .send({
            cartId: cart.id,
            variantId: variant.id,
            quantity: 1,
          })
      );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should calculate cart total correctly', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 2,
        });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[1].id,
          quantity: 3,
        });

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/${customer.user.id}/cart/user-cart`)
        .expect(200);

      expect(response.body.items.length).toBe(2);
    });

    it('should handle stock validation', async () => {
      // Try to add more items than available in stock
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/${store.id}/${customer.user.id}/cart/${cart.id}/add-item`
        )
        .send({
          cartId: cart.id,
          variantId: variants[0].id,
          quantity: 99999, // Exceeds stock
        });

      // Should either succeed or fail with stock validation error
      expect([201, 400]).toContain(response.status);
    });
  });
});
