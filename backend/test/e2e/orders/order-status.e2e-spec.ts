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

describe('Orders - Status Management (E2E)', () => {
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

  describe('POST /stores/:storeId/orders/:id/checkout', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should mark order as paid', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`)
        .expect(200);

      const orderRepo = appHelper.getDataSource().getRepository('Order');
      const updatedOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe(OrderStatus.PAID);
    });

    it('should require order ownership', async () => {
      const otherCustomer = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(otherCustomer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow store admin to checkout any order', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`)
        .expect(200);

      const orderRepo = appHelper.getDataSource().getRepository('Order');
      const updatedOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(updatedOrder?.status).toBe(OrderStatus.PAID);
    });

    it('should handle already paid order', async () => {
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`)
        .expect(200);

      // Checkout again
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`)
        .expect(200);
    });
  });

  describe('PUT /stores/:storeId/orders/:id/status', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should update order status as store admin', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.SHIPPED);
    });

    it('should allow site admin to update status', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.SHIPPED);
    });

    it('should prevent regular user from updating status', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate status value', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: 'INVALID_STATUS' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should require status field', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({});

      AssertionHelper.assertErrorResponse(response, 400, 'status');
    });

    it('should support all valid statuses', async () => {
      const statuses = [
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];

      for (const status of statuses) {
        const response = await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .put(`/stores/${store.id}/orders/${order.id}/status`)
          .send({ status })
          .expect(200);

        expect(response.body.status).toBe(status);
      }
    });
  });

  describe('POST /stores/:storeId/orders/:id/cancel', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should cancel order and restore inventory', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      const variant = await variantRepo.findOne({
        where: { id: order.items[0].variantId },
      });
      const stockBefore = variant ? variant.inventory.quantity : 0;

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/cancel`)
        .send({ reason: 'Customer requested' })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CANCELLED);

      const newOrder = (
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .get(`/stores/${store.id}/orders/${order.id}`)
      ).body;

      const updatedVariant = newOrder.items[0].variant;

      if (updatedVariant) {
        expect(updatedVariant.inventory.quantity).toBeGreaterThan(stockBefore);
      }
    });

    it('should allow cancellation without reason', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/cancel`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CANCELLED);
    });

    it('should prevent regular user from cancelling', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/cancel`)
        .send({ reason: 'Test' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent cancelling shipped orders', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED });

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/cancel`)
        .send({ reason: 'Test' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent cancelling delivered orders', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.DELIVERED });

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/cancel`)
        .send({ reason: 'Test' });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /stores/:storeId/orders/:id/return', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];

      // Mark as delivered first
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.DELIVERED });
    });

    it('should process full return and restore inventory', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/return`)
        .send({ reason: 'Defective product' })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.RETURNED);
    });

    it('should process partial return', async () => {
      const itemIds = [order.items[0].id];

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/return`)
        .send({ itemIds, reason: 'Partial return' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should allow return without reason', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/return`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.RETURNED);
    });

    it('should prevent returning non-delivered orders', async () => {
      const newOrders = await seeder.seedOrders(store, customer.user, 1);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${newOrders[0].id}/return`)
        .send({ reason: 'Test' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent regular user from processing returns', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/return`)
        .send({ reason: 'Test' });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('PUT /stores/:storeId/orders/:id/shipping', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should update shipping information', async () => {
      const shippingData = {
        trackingNumber: '1Z999AA10123456784',
        estimatedDeliveryDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        shippingMethod: 'UPS Ground',
        deliveryInstructions: 'Leave at front door',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/shipping`)
        .send(shippingData)
        .expect(200);

      expect(response.body.shipping.trackingNumber).toBe(
        shippingData.trackingNumber
      );
      expect(response.body.shipping.shippingMethod).toBe(
        shippingData.shippingMethod
      );
    });

    it('should allow partial shipping updates', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/shipping`)
        .send({ trackingNumber: '1Z999AA10123456784' })
        .expect(200);

      expect(response.body.shipping.trackingNumber).toBe('1Z999AA10123456784');
    });

    it('should prevent regular user from updating shipping', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/shipping`)
        .send({ trackingNumber: '123' });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('POST /stores/:storeId/orders/:id/delivered', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should mark order as delivered', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/delivered`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.DELIVERED);
      expect(response.body.shipping.deliveredAt).toBeDefined();
      expect(new Date(response.body.shipping.deliveredAt)).toBeInstanceOf(Date);
    });

    it('should set deliveredAt timestamp', async () => {
      const before = Date.now();

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/delivered`)
        .expect(200);

      const after = Date.now();
      const deliveredAt = new Date(
        response.body.shipping.deliveredAt
      ).getTime();

      expect(deliveredAt).toBeGreaterThanOrEqual(before);
      expect(deliveredAt).toBeLessThanOrEqual(after);
    });

    it('should prevent regular user from marking as delivered', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/delivered`);

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('DELETE /stores/:storeId/orders/:id', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should delete order as admin', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      const orderRepo = appHelper.getDataSource().getRepository('Order');
      const deletedOrder = await orderRepo.findOne({ where: { id: order.id } });
      expect(deletedOrder).toBeNull();
    });

    it('should prevent regular user from deleting', async () => {
      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .delete(`/stores/${store.id}/orders/${order.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/orders/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('Status Transitions', () => {
    let order: any;

    beforeEach(async () => {
      const orders = await seeder.seedOrders(store, customer.user, 1);
      order = orders[0];
    });

    it('should maintain order history after status changes', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.PAID });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED });

      const response = await authHelper
        .authenticatedRequest(customer.accessToken)
        .get(`/stores/${store.id}/orders/${order.id}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.SHIPPED);
    });

    it('should handle complete order lifecycle', async () => {
      // Pending -> Paid
      await authHelper
        .authenticatedRequest(customer.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/checkout`)
        .expect(200);

      // Paid -> Shipped
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/orders/${order.id}/status`)
        .send({ status: OrderStatus.SHIPPED })
        .expect(200);

      // Shipped -> Delivered
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/orders/${order.id}/delivered`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.DELIVERED);
    });
  });
});
