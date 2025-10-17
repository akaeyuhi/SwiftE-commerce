import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Orders - Creation (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
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
    storeOwner = await authHelper.createAuthenticatedUser();
    customer = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
    variants = await seeder.seedVariants(product, 3);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['orders']);
  });

  describe('POST /stores/:storeId/orders/:userId/create', () => {
    // ✅ Simplified - userId and storeId come from route params
    const getValidOrderData = () => ({
      items: [
        {
          variantId: variants[0].id,
          productId: product.id,
          productName: 'Test Product',
          sku: 'TEST-SKU',
          unitPrice: 29.99,
          quantity: 2,
        },
      ],
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
    });

    it('should create order for authenticated user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`) // ✅ Added userId to URL
        .send(getValidOrderData())
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(customer.user.id);
      expect(response.body.storeId).toBe(store.id);
      expect(response.body.status).toBe(OrderStatus.PENDING);
      expect(response.body.items.length).toBe(1);
      expect(response.body).toHaveProperty('totalAmount');
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should create order with multiple items', async () => {
      const multiItemOrder = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Product 1',
            sku: 'SKU-1',
            unitPrice: 29.99,
            quantity: 2,
          },
          {
            variantId: variants[1].id,
            productId: product.id,
            productName: 'Product 2',
            sku: 'SKU-2',
            unitPrice: 39.99,
            quantity: 1,
          },
        ],
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          postalCode: '10001',
          country: 'US',
        },
      };

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(multiItemOrder)
        .expect(201);

      expect(response.body.items.length).toBe(2);
      expect(parseFloat(response.body.totalAmount)).toBeCloseTo(99.97, 2);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(getValidOrderData());

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate items array is not empty', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send({
          items: [],
          shipping: getValidOrderData().shipping,
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate items array is provided', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send({ shipping: getValidOrderData().shipping });

      AssertionHelper.assertErrorResponse(response, 400, 'items');
    });

    it('should validate shipping information is required', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send({ items: getValidOrderData().items });

      AssertionHelper.assertErrorResponse(response, 400, 'shipping');
    });

    it('should validate shipping firstName', async () => {
      const data = getValidOrderData();
      data.shipping.firstName = '';

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(data);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate shipping address', async () => {
      const data = getValidOrderData();
      data.shipping.addressLine1 = '';

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(data);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate item quantity is positive', async () => {
      const data = getValidOrderData();
      data.items[0].quantity = 0;

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(data);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate item price is positive', async () => {
      const data = getValidOrderData();
      data.items[0].unitPrice = -10;

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(data);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should calculate total amount correctly', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(getValidOrderData())
        .expect(201);

      const expectedTotal = 29.99 * 2;
      expect(parseFloat(response.body.totalAmount)).toBeCloseTo(
        expectedTotal,
        2
      );
    });

    it('should prevent creating order for another user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${adminUser.user.id}/create`)
        .send(getValidOrderData());

      AssertionHelper.assertErrorResponse(response, 400, 'another user');
    });

    it('should allow admin to create order for any user', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`) // ✅ Admin creating for customer
        .send(getValidOrderData())
        .expect(201);

      expect(response.body.userId).toBe(customer.user.id);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/invalid-uuid/orders/${customer.user.id}/create`)
        .send(getValidOrderData());

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate user UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/invalid-uuid/create`)
        .send(getValidOrderData());

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate store exists', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(
          `/stores/00000000-0000-0000-0000-000000000000/orders/${customer.user.id}/create`
        )
        .send(getValidOrderData());

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should include shipping information in created order', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(getValidOrderData())
        .expect(201);

      expect(response.body.shipping).toBeDefined();
      expect(response.body.shipping.firstName).toBe('John');
      expect(response.body.shipping.lastName).toBe('Doe');
      expect(response.body.shipping.addressLine1).toBe('123 Main St');
    });

    it('should set billing address same as shipping by default', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(getValidOrderData())
        .expect(201);

      if (response.body.billing) {
        expect(response.body.billing.addressLine1).toBe('123 Main St');
      }
    });

    it('should record checkout analytics event', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(getValidOrderData())
        .expect(201);

      const eventRepo = appHelper
        .getDataSource()
        .getRepository('AnalyticsEvent');
      const events = await eventRepo.find({
        where: {
          storeId: store.id,
          eventType: 'checkout',
          userId: customer.user.id,
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Inventory Integration', () => {
    it('should deduct inventory when creating order', async () => {
      const orderData = getValidOrderData();

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const initialVariant = await variantRepo.findOne({
        where: { id: variants[0].id },
        relations: ['inventory'],
      });
      const initialStock = initialVariant?.inventory.quantity;

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(201);

      const updatedVariant = await variantRepo.findOne({
        where: { id: variants[0].id },
        relations: ['inventory'],
      });
      expect(updatedVariant?.inventory.quantity).toBe(initialStock - 2);
    });

    it('should fail if insufficient stock', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const variant = await variantRepo.findOne({
        where: { id: variants[0].id },
        relations: ['inventory'],
      });

      const orderData = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Test Product',
            sku: 'TEST-SKU',
            unitPrice: 29.99,
            quantity: (variant?.inventory.quantity || 0) + 100,
          },
        ],
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          postalCode: '10001',
          country: 'US',
        },
      };

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(400);

      expect(response.body.errors[0]).toContain('stock');
    });

    it('should deduct inventory for multiple items', async () => {
      const orderData = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Product 1',
            sku: 'SKU-1',
            unitPrice: 29.99,
            quantity: 2,
          },
          {
            variantId: variants[1].id,
            productId: product.id,
            productName: 'Product 2',
            sku: 'SKU-2',
            unitPrice: 39.99,
            quantity: 3,
          },
        ],
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          postalCode: '10001',
          country: 'US',
        },
      };

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');

      const variant1Before = await variantRepo.findOne({
        where: { id: variants[0].id },
        relations: ['inventory'],
      });
      const variant2Before = await variantRepo.findOne({
        where: { id: variants[1].id },
        relations: ['inventory'],
      });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(201);

      const variant1After = await variantRepo.findOne({
        where: { id: variants[0].id },
        relations: ['inventory'],
      });
      const variant2After = await variantRepo.findOne({
        where: { id: variants[1].id },
        relations: ['inventory'],
      });

      expect(variant1After?.inventory.quantity).toBe(
        (variant1Before?.inventory.quantity || 0) - 2
      );
      expect(variant2After?.inventory.quantity).toBe(
        (variant2Before?.inventory.quantity || 0) - 3
      );
    });

    it('should rollback if any item has insufficient stock', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const variant1Before = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const variant2Before = await variantRepo.findOne({
        where: { id: variants[1].id },
      });

      const orderData = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Product 1',
            sku: 'SKU-1',
            unitPrice: 29.99,
            quantity: 1,
          },
          {
            variantId: variants[1].id,
            productId: product.id,
            productName: 'Product 2',
            sku: 'SKU-2',
            unitPrice: 39.99,
            quantity: 99999,
          },
        ],
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          postalCode: '10001',
          country: 'US',
        },
      };

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(400);

      const variant1After = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const variant2After = await variantRepo.findOne({
        where: { id: variants[1].id },
      });

      expect(variant1After?.quantity).toBe(variant1Before?.quantity);
      expect(variant2After?.quantity).toBe(variant2Before?.quantity);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent order creation', async () => {
      const orderData = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Test',
            sku: 'TEST',
            unitPrice: 10,
            quantity: 1,
          },
        ],
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main',
          city: 'NYC',
          postalCode: '10001',
          country: 'US',
        },
      };

      const requests = Array(2)
        .fill(null)
        .map(() =>
          authHelper
            .authenticatedRequest(customer.accessToken)
            .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
            .send(orderData)
        );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle special characters in shipping info', async () => {
      const orderData = {
        items: [
          {
            variantId: variants[0].id,
            productId: product.id,
            productName: 'Test',
            sku: 'TEST',
            unitPrice: 29.99,
            quantity: 1,
          },
        ],
        shipping: {
          firstName: `O'Brien`,
          lastName: 'Müller',
          addressLine1: '123 Main St, Apt #5',
          city: 'São Paulo',
          postalCode: '01000-000',
          country: 'BR',
        },
      };

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(201);

      expect(response.body.shipping.firstName).toBe(`O'Brien`);
      expect(response.body.shipping.lastName).toBe('Müller');
    });

    it('should handle very long order with many items', async () => {
      const manyItems = variants.map((variant, index) => ({
        variantId: variant.id,
        productId: product.id,
        productName: `Product ${index}`,
        sku: `SKU-${index}`,
        unitPrice: 10 + index,
        quantity: 1,
      }));

      const orderData = {
        items: manyItems,
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main',
          city: 'NYC',
          postalCode: '10001',
          country: 'US',
        },
      };

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${customer.user.id}/create`)
        .send(orderData)
        .expect(201);

      expect(response.body.items.length).toBe(variants.length);
    });
  });

  function getValidOrderData() {
    return {
      items: [
        {
          variantId: variants[0].id,
          productId: product.id,
          productName: 'Test Product',
          sku: 'TEST-SKU',
          unitPrice: 29.99,
          quantity: 2,
        },
      ],
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
    };
  }
});
