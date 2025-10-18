import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { ProductsModule } from 'src/modules/products/products.module';

describe('Variants (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;
  let product: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, ProductsModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];

    await seeder.assignStoreModerator(storeModerator.user.id, store.id);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['product_variants', 'inventory']);
  });

  describe('GET /stores/:storeId/products/:productId/variants', () => {
    beforeEach(async () => {
      await seeder.seedVariants(product, 3);
    });

    it('should get all variants for a product', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      response.body.forEach((variant: any) => {
        expect(variant).toHaveProperty('id');
        expect(variant).toHaveProperty('sku');
        expect(variant).toHaveProperty('price');
        expect(variant.productId).toBe(product.id);
      });
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/stores/${store.id}/products/${product.id}/variants`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate store UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/invalid-uuid/products/${product.id}/variants`);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate product UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/invalid-uuid/variants`);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /stores/:storeId/products/:productId/variants/by-sku/:sku', () => {
    let variant: any;

    beforeEach(async () => {
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];
    });

    it('should find variant by SKU', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/variants/by-sku/${variant.sku}`
        )
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.sku).toBe(variant.sku);
      expect(response.body.productId).toBe(product.id);
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/variants/by-sku/INVALID-SKU`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('POST /stores/:storeId/products/:productId/variants/:id/attributes', () => {
    let variant: any;

    beforeEach(async () => {
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];
    });

    it('should add attributes to variant', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'L',
          color: 'Blue',
          material: 'Cotton',
        })
        .expect(200);

      expect(response.body.attributes).toMatchObject({
        size: 'L',
        color: 'Blue',
        material: 'Cotton',
      });
    });

    it('should merge with existing attributes', async () => {
      // First, add initial attributes
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'M',
          color: 'Red',
        })
        .expect(200);

      // Then, add more attributes
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          material: 'Polyester',
          weight: '200g',
        })
        .expect(200);

      expect(response.body.attributes).toMatchObject({
        size: 'M',
        color: 'Red',
        material: 'Polyester',
        weight: '200g',
      });
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'L',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user access', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'L',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate variant UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/invalid-uuid/attributes`
        )
        .send({
          size: 'L',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('DELETE /stores/:storeId/products/:productId/variants/:id/attributes/:key', () => {
    let variant: any;

    beforeEach(async () => {
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];

      // Add some attributes first
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'L',
          color: 'Blue',
          material: 'Cotton',
        });
    });

    it('should remove specific attribute', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes/color`
        )
        .expect(200);

      expect(response.body.attributes).not.toHaveProperty('color');
      expect(response.body.attributes).toHaveProperty('size');
      expect(response.body.attributes).toHaveProperty('material');
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes/color`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle non-existent attribute key', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes/nonexistent`
        )
        .expect(200);

      // Should still return successfully
      expect(response.body).toHaveProperty('attributes');
    });
  });

  describe('POST /stores/:storeId/products/:productId/variants/:id/inventory', () => {
    let variant: any;

    beforeEach(async () => {
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];
    });

    it('should set inventory quantity', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 })
        .expect(200);

      expect(response.body).toHaveProperty('quantity');
      expect(response.body.quantity).toBe(100);
    });

    it('should create inventory record if not exists', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 50 })
        .expect(200);

      expect(response.body.quantity).toBe(50);

      // Verify inventory record exists
      const inventoryRepo = appHelper
        .getDataSource()
        .getRepository('Inventory');
      const inventory = await inventoryRepo.findOne({
        where: { variantId: variant.id },
      });

      expect(inventory).toBeDefined();
      expect(inventory?.quantity).toBe(50);
    });

    it('should validate quantity is non-negative', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: -10 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should require store admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('PATCH /stores/:storeId/products/:productId/variants/:id/inventory', () => {
    let variant: any;

    beforeEach(async () => {
      await appHelper.clearTables(['product_variants', 'inventory']);
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];

      // Set initial inventory
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 100 });
    });

    it('should adjust inventory by positive delta', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 50 })
        .expect(200);

      expect(response.body.quantity).toBe(150);
    });

    it('should adjust inventory by negative delta', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -25 })
        .expect(200);

      expect(response.body.quantity).toBe(75);
    });

    it('should prevent negative inventory', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -150 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should allow store moderator to adjust inventory', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: 10 })
        .expect(200);

      expect(response.body.quantity).toBe(110);
    });

    it('should trigger low-stock alert when crossing threshold', async () => {
      // Set inventory near threshold
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 15 });

      // Adjust to below threshold (assuming threshold is 10)
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -10 })
        .expect(200);

      // Wait for notification processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check notification was sent
      const notificationRepo = appHelper
        .getDataSource()
        .getRepository('InventoryNotificationLog');
      const notifications = await notificationRepo.find({
        where: { variantId: variant.id },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /stores/:storeId/products/:productId/variants/:id/price', () => {
    let variant: any;

    beforeEach(async () => {
      const variants = await seeder.seedVariants(product, 1);
      variant = variants[0];
    });

    it('should update variant price', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/price`
        )
        .send({ price: 49.99 })
        .expect(200);

      expect(response.body.price).toBe(49.99);
    });

    it('should allow store moderator to update price', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/price`
        )
        .send({ price: 39.99 })
        .expect(200);

      expect(response.body.price).toBe(39.99);
    });

    it('should validate price is non-negative', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/price`
        )
        .send({ price: -10 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent regular user from updating price', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/price`
        )
        .send({ price: 29.99 });

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });

  describe('Variant Complete Flow', () => {
    it('should manage variant lifecycle', async () => {
      // 1. Create variant (via seeder)
      const variants = await seeder.seedVariants(product, 1);
      const variant = variants[0];

      expect(variant).toHaveProperty('id');
      expect(variant).toHaveProperty('sku');

      // 2. Add attributes
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/attributes`
        )
        .send({
          size: 'XL',
          color: 'Black',
          material: 'Premium Cotton',
        })
        .expect(200);

      // 3. Set inventory
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ quantity: 200 })
        .expect(200);

      // 4. Update price
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/price`
        )
        .send({ price: 59.99 })
        .expect(200);

      // 5. Adjust inventory (simulate sale)
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .patch(
          `/stores/${store.id}/products/${product.id}/variants/${variant.id}/inventory`
        )
        .send({ delta: -5 })
        .expect(200);

      // 6. Verify final state
      const finalVariants = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/variants`)
        .expect(200);

      const updatedVariant = finalVariants.body.find(
        (v: any) => v.id === variant.id
      );
      expect(parseFloat(updatedVariant.price)).toBe(59.99);
      expect(updatedVariant.attributes).toMatchObject({
        size: 'XL',
        color: 'Black',
        material: 'Premium Cotton',
      });
    });
  });
});
