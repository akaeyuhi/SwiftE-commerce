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
    await appHelper.cleanup();
  });

  afterEach(async () => {
    const orderRepo = appHelper.getDataSource().getRepository('Order');
    await orderRepo.clear();
  });

  describe('POST /stores/:storeId/orders/create', () => {
    const validOrderData = {
      items: [
        {
          variantId: null, // Will be set in test
          productId: null, // Will be set in test
          productName: 'Test Product',
          sku: 'TEST-SKU',
          unitPrice: 29.99,
          quantity: 2,
        },
      ],
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
    };

    beforeEach(() => {
      validOrderData.items[0].variantId = variants[0].id;
      validOrderData.items[0].productId = product.id;
    });

    it('should create order for authenticated user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData)
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
        ...validOrderData,
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
      };

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(multiItemOrder)
        .expect(201);

      expect(response.body.items.length).toBe(2);
      expect(response.body.totalAmount).toBeCloseTo(99.97, 2); // (29.99 * 2) + (39.99 * 1)
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate items array is not empty', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({ ...validOrderData, items: [] });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate items array is provided', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({ shipping: validOrderData.shipping });

      AssertionHelper.assertErrorResponse(response, 400, 'items');
    });

    it('should validate shipping information is required', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({ items: validOrderData.items });

      AssertionHelper.assertErrorResponse(response, 400, 'shipping');
    });

    it('should validate shipping firstName', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          shipping: { ...validOrderData.shipping, firstName: '' },
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate shipping address', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          shipping: { ...validOrderData.shipping, address: '' },
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate item quantity is positive', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          items: [
            {
              ...validOrderData.items[0],
              quantity: 0,
            },
          ],
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate item price is positive', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          items: [
            {
              ...validOrderData.items[0],
              unitPrice: -10,
            },
          ],
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should calculate total amount correctly', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData)
        .expect(201);

      const expectedTotal =
        validOrderData.items[0].unitPrice * validOrderData.items[0].quantity;
      expect(response.body.totalAmount).toBeCloseTo(expectedTotal, 2);
    });

    it('should prevent creating order for another user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          userId: adminUser.user.id,
        });

      AssertionHelper.assertErrorResponse(response, 400, 'another user');
    });

    it('should allow admin to create order for any user', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...validOrderData,
          userId: customer.user.id,
        })
        .expect(201);

      expect(response.body.userId).toBe(customer.user.id);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/stores/invalid-uuid/orders/create')
        .send(validOrderData);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate store exists', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post('/stores/00000000-0000-0000-0000-000000000000/orders/create')
        .send(validOrderData);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should include shipping information in created order', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData)
        .expect(201);

      expect(response.body.shipping).toBeDefined();
      expect(response.body.shipping.firstName).toBe(
        validOrderData.shipping.firstName
      );
      expect(response.body.shipping.lastName).toBe(
        validOrderData.shipping.lastName
      );
      expect(response.body.shipping.address).toBe(
        validOrderData.shipping.address
      );
    });

    it('should set billing address same as shipping by default', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData)
        .expect(201);

      if (response.body.billing) {
        expect(response.body.billing.address).toBe(
          validOrderData.shipping.address
        );
      }
    });

    it('should record checkout analytics event', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(validOrderData)
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
    const orderData = {
      items: [
        {
          variantId: null,
          productId: null,
          productName: 'Test Product',
          sku: 'TEST-SKU',
          unitPrice: 29.99,
          quantity: 2,
        },
      ],
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
    };

    beforeEach(() => {
      orderData.items[0].variantId = variants[0].id;
      orderData.items[0].productId = product.id;
    });

    it('should deduct inventory when creating order', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const initialVariant = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const initialStock = initialVariant?.stock;

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send(orderData)
        .expect(201);

      const updatedVariant = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      expect(updatedVariant?.stock).toBe(
        initialStock - orderData.items[0].quantity
      );
    });

    it('should fail if insufficient stock', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const variant = await variantRepo.findOne({
        where: { id: variants[0].id },
      });

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...orderData,
          items: [
            {
              ...orderData.items[0],
              quantity: variant?.stock + 100, // Exceeds available stock
            },
          ],
        });

      AssertionHelper.assertErrorResponse(response, 400, 'stock');
    });

    it('should deduct inventory for multiple items', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');

      const variant1Before = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const variant2Before = await variantRepo.findOne({
        where: { id: variants[1].id },
      });

      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...orderData,
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
        })
        .expect(201);

      const variant1After = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const variant2After = await variantRepo.findOne({
        where: { id: variants[1].id },
      });

      expect(variant1After?.stock).toBe(variant1Before?.stock - 2);
      expect(variant2After?.stock).toBe(variant2Before?.stock - 3);
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

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          ...orderData,
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
              quantity: 99999, // Exceeds stock
            },
          ],
        });

      AssertionHelper.assertErrorResponse(response, 400);

      // Verify no inventory was deducted
      const variant1After = await variantRepo.findOne({
        where: { id: variants[0].id },
      });
      const variant2After = await variantRepo.findOne({
        where: { id: variants[1].id },
      });

      expect(variant1After?.stock).toBe(variant1Before?.stock);
      expect(variant2After?.stock).toBe(variant2Before?.stock);
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
          address: '123 Main',
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
            .post(`/stores/${store.id}/orders/create`)
            .send(orderData)
        );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle special characters in shipping info', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
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
            address: '123 Main St, Apt #5',
            city: 'São Paulo',
            postalCode: '01000-000',
            country: 'BR',
          },
        })
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

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/create`)
        .send({
          items: manyItems,
          shipping: {
            firstName: 'John',
            lastName: 'Doe',
            address: '123 Main',
            city: 'NYC',
            postalCode: '10001',
            country: 'US',
          },
        })
        .expect(201);

      expect(response.body.items.length).toBe(variants.length);
    });
  });
});
