import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Products - Variants (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let storeOwner: any;
  let store: any;
  let product: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    storeOwner = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
  });


  beforeEach(async () => {
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['product_variants']);
  });

  describe('Creating product variants', () => {
    it('should create variants with product', async () => {
      const productData = {
        name: 'T-Shirt',
        description: 'Cotton T-Shirt',
        variants: [
          {
            sku: 'TSHIRT-S-RED',
            price: 19.99,
            stock: 100,
            attributes: { size: 'S', color: 'Red' },
          },
          {
            sku: 'TSHIRT-M-RED',
            price: 19.99,
            stock: 150,
            attributes: { size: 'M', color: 'Red' },
          },
          {
            sku: 'TSHIRT-L-RED',
            price: 22.99,
            stock: 120,
            attributes: { size: 'L', color: 'Red' },
          },
        ],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.variants).toBeDefined();
      expect(response.body.variants.length).toBe(3);
      expect(response.body.variants[0]).toHaveProperty('sku');
      expect(response.body.variants[0]).toHaveProperty('price');
      expect(response.body.variants[0]).toHaveProperty('stock');
      expect(response.body.variants[0]).toHaveProperty('attributes');
    });

    it('should validate variant SKU uniqueness', async () => {
      const productData = {
        name: 'Product',
        description: 'Test',
        variants: [
          { sku: 'DUPLICATE-SKU', price: 10, stock: 50 },
          { sku: 'DUPLICATE-SKU', price: 10, stock: 50 },
        ],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData);

      AssertionHelper.assertErrorResponse(response, 400, 'SKU');
    });

    it('should require price for variants', async () => {
      const productData = {
        name: 'Product',
        variants: [{ sku: 'TEST-SKU', stock: 50 }],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate price is positive', async () => {
      const productData = {
        name: 'Product',
        variants: [{ sku: 'TEST-SKU', price: -10, stock: 50 }],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate stock is non-negative', async () => {
      const productData = {
        name: 'Product',
        variants: [{ sku: 'TEST-SKU', price: 10, stock: -5 }],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('Retrieving product variants', () => {
    it('should include variants in detailed product view', async () => {
      await seeder.seedVariants(product, 3);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/detailed`)
        .expect(200);

      expect(response.body.variants).toBeDefined();
      expect(response.body.variants.length).toBe(3);

      response.body.variants.forEach((variant: any) => {
        expect(variant).toHaveProperty('id');
        expect(variant).toHaveProperty('sku');
        expect(variant).toHaveProperty('price');
        expect(variant).toHaveProperty('stock');
        AssertionHelper.assertUUID(variant.id);
      });
    });

    it('should calculate price range from variants', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.save([
        {
          product,
          sku: 'VAR-1',
          price: 10.0,
          stock: 50,
        },
        {
          product,
          sku: 'VAR-2',
          price: 25.0,
          stock: 30,
        },
        {
          product,
          sku: 'VAR-3',
          price: 15.0,
          stock: 40,
        },
      ]);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/detailed`)
        .expect(200);

      expect(response.body).toHaveProperty('minPrice', 10.0);
      expect(response.body).toHaveProperty('maxPrice', 25.0);
    });

    it('should show in-stock status', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.save([
        {
          product,
          sku: 'IN-STOCK',
          price: 10.0,
          stock: 50,
        },
        {
          product,
          sku: 'OUT-STOCK',
          price: 10.0,
          stock: 0,
        },
      ]);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/detailed`)
        .expect(200);

      const inStock = response.body.variants.find(
        (v: any) => v.sku === 'IN-STOCK'
      );
      const outOfStock = response.body.variants.find(
        (v: any) => v.sku === 'OUT-STOCK'
      );

      expect(inStock.stock).toBeGreaterThan(0);
      expect(outOfStock.stock).toBe(0);
    });
  });

  describe('Updating product variants', () => {
    it('should update variant price', async () => {
      const variants = await seeder.seedVariants(product, 1);
      const variant = variants[0];

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.update(variant.id, { price: 29.99 });

      const updatedVariant = await variantRepo.findOne({
        where: { id: variant.id },
      });

      expect(updatedVariant?.price).toBe(29.99);
    });

    it('should update variant stock', async () => {
      const variants = await seeder.seedVariants(product, 1);
      const variant = variants[0];

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.update(variant.id, { stock: 200 });

      const updatedVariant = await variantRepo.findOne({
        where: { id: variant.id },
      });

      expect(updatedVariant?.stock).toBe(200);
    });

    it('should update variant attributes', async () => {
      const variants = await seeder.seedVariants(product, 1);
      const variant = variants[0];

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.update(variant.id, {
        attributes: { size: 'XL', color: 'Blue' },
      });

      const updatedVariant = await variantRepo.findOne({
        where: { id: variant.id },
      });

      expect(updatedVariant?.attributes).toEqual({ size: 'XL', color: 'Blue' });
    });
  });

  describe('Deleting product variants', () => {
    it('should delete variant', async () => {
      const variants = await seeder.seedVariants(product, 2);
      const variantToDelete = variants[0];

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.delete(variantToDelete.id);

      const deletedVariant = await variantRepo.findOne({
        where: { id: variantToDelete.id },
      });

      expect(deletedVariant).toBeNull();
    });

    it('should keep other variants when deleting one', async () => {
      const variants = await seeder.seedVariants(product, 3);

      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.delete(variants[0].id);

      const remainingVariants = await variantRepo.find({
        where: { product: { id: product.id } },
      });

      expect(remainingVariants.length).toBe(2);
    });
  });

  describe('Variant attributes', () => {
    it('should support custom attributes', async () => {
      const productData = {
        name: 'Custom Product',
        variants: [
          {
            sku: 'CUSTOM-1',
            price: 99.99,
            stock: 10,
            attributes: {
              size: 'Large',
              color: 'Blue',
              material: 'Cotton',
              weight: '500g',
            },
          },
        ],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.variants[0].attributes).toEqual({
        size: 'Large',
        color: 'Blue',
        material: 'Cotton',
        weight: '500g',
      });
    });

    it('should allow empty attributes', async () => {
      const productData = {
        name: 'Simple Product',
        variants: [
          {
            sku: 'SIMPLE-1',
            price: 10.0,
            stock: 100,
            attributes: {},
          },
        ],
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.variants[0].attributes).toEqual({});
    });
  });

  describe('Product without variants', () => {
    it('should allow products without variants', async () => {
      const productData = {
        name: 'No Variant Product',
        description: 'Simple product without variants',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData)
        .expect(201);

      expect(response.body.variants || []).toEqual([]);
    });

    it('should show empty variants array in detailed view', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/detailed`)
        .expect(200);

      expect(response.body.variants || []).toEqual([]);
    });
  });

  describe('SKU validation', () => {
    it('should enforce unique SKUs across store', async () => {
      const product1Data = {
        name: 'Product 1',
        variants: [{ sku: 'UNIQUE-SKU', price: 10, stock: 50 }],
      };

      const product2Data = {
        name: 'Product 2',
        variants: [{ sku: 'UNIQUE-SKU', price: 15, stock: 30 }],
      };

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(product1Data)
        .expect(201);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(product2Data);

      AssertionHelper.assertErrorResponse(response, 400, 'SKU');
    });

    it('should allow same SKU in different stores', async () => {
      const anotherOwner = await authHelper.createAuthenticatedUser();
      const anotherStore = await seeder.seedStore(anotherOwner.user);

      const productData = {
        name: 'Product',
        variants: [{ sku: 'SAME-SKU', price: 10, stock: 50 }],
      };

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .send(productData)
        .expect(201);

      await authHelper
        .authenticatedRequest(anotherOwner.accessToken)
        .post(`/stores/${anotherStore.id}/products`)
        .send(productData)
        .expect(201);
    });
  });

  describe('Stock management', () => {
    it('should track total stock across variants', async () => {
      const variantRepo = appHelper
        .getDataSource()
        .getRepository('ProductVariant');
      await variantRepo.save([
        { product, sku: 'VAR-1', price: 10, stock: 50 },
        { product, sku: 'VAR-2', price: 10, stock: 30 },
        { product, sku: 'VAR-3', price: 10, stock: 20 },
      ]);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/detailed`)
        .expect(200);

      const totalStock = response.body.variants.reduce(
        (sum: number, v: any) => sum + v.stock,
        0
      );

      expect(totalStock).toBe(100);
    });
  });
});
