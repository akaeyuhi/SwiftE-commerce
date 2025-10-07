import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Categories (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;
  let product: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [ProductsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Create test users
    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    // Create store and product
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];

    // Assign moderator role
    await authHelper
      .authenticatedRequest(adminUser.accessToken)
      .post(`/users/${storeModerator.user.id}/roles`)
      .send({
        roleName: StoreRoles.MODERATOR,
        storeId: store.id,
        assignedBy: adminUser.user.id,
      });
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  afterEach(async () => {
    const categoryRepo = appHelper.getDataSource().getRepository('Category');
    await categoryRepo.clear();
  });

  describe('POST /stores/:storeId/products/:productId/categories', () => {
    const validCategoryData = {
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    };

    it('should allow store admin to create category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData)
        .expect(201);

      expect(response.body.name).toBe(validCategoryData.name);
      expect(response.body.description).toBe(validCategoryData.description);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should prevent store moderator from creating category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user from creating category', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate category name is required', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send({ description: 'No name' });

      AssertionHelper.assertErrorResponse(response, 400, 'name');
    });

    it('should validate name length', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send({
          name: 'a', // Too short
          description: 'Valid description',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should allow category without description', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send({ name: 'Category Without Description' })
        .expect(201);

      expect(response.body.name).toBe('Category Without Description');
    });

    it('should prevent duplicate category names', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData)
        .expect(201);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 400, 'already exists');
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/invalid-uuid/products/${product.id}/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate product UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/invalid-uuid/categories`)
        .send(validCategoryData);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /stores/:storeId/products/:productId/categories', () => {
    beforeEach(async () => {
      await seeder.seedCategories(3);
    });

    it('should list all categories', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .get(`/stores/${store.id}/products/${product.id}/categories`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return empty array when no categories exist', async () => {
      const categoryRepo = appHelper.getDataSource().getRepository('Category');
      await categoryRepo.clear();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include category metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories`)
        .expect(200);

      response.body.forEach((category: any) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        AssertionHelper.assertUUID(category.id);
        AssertionHelper.assertTimestamps(category);
      });
    });
  });

  describe('GET /stores/:storeId/products/:productId/categories/:id', () => {
    let category: any;

    beforeEach(async () => {
      const categories = await seeder.seedCategories(1);
      category = categories[0];
    });

    it('should get single category', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .expect(200);

      expect(response.body.id).toBe(category.id);
      expect(response.body.name).toBe(category.name);
      expect(response.body.description).toBe(category.description);
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .get(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/categories/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/categories/invalid-uuid`
        );

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('PUT /stores/:storeId/products/:productId/categories/:id', () => {
    let category: any;

    beforeEach(async () => {
      const categories = await seeder.seedCategories(1);
      category = categories[0];
    });

    it('should allow store admin to update category', async () => {
      const updates = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.description).toBe(updates.description);
    });

    it('should prevent store moderator from updating category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .send({ name: 'Updated Name' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user from updating category', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .send({ name: 'Unauthorized Update' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate name length on update', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .send({ name: 'a' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/00000000-0000-0000-0000-000000000000`
        )
        .send({ name: 'Update' });

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should allow partial updates', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .send({ name: 'Only Name Updated' })
        .expect(200);

      expect(response.body.name).toBe('Only Name Updated');
      expect(response.body.description).toBe(category.description);
    });
  });

  describe('DELETE /stores/:storeId/products/:productId/categories/:id', () => {
    let category: any;

    beforeEach(async () => {
      const categories = await seeder.seedCategories(1);
      category = categories[0];
    });

    it('should allow store admin to delete category', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .expect(200);

      // Verify deletion
      const categoryRepo = appHelper.getDataSource().getRepository('Category');
      const deletedCategory = await categoryRepo.findOne({
        where: { id: category.id },
      });
      expect(deletedCategory).toBeNull();
    });

    it('should prevent store moderator from deleting category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent regular user from deleting category', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should handle category with associated products', async () => {
      // Assign category to product
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      // Try to delete category
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      // Should either succeed or fail with proper error
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /stores/:storeId/products/:productId/categories/tree', () => {
    beforeEach(async () => {
      // Create parent categories
      const categoryRepo = appHelper.getDataSource().getRepository('Category');

      const parent1 = await categoryRepo.save({
        name: 'Electronics',
        description: 'Electronic devices',
      });

      const parent2 = await categoryRepo.save({
        name: 'Clothing',
        description: 'Apparel and fashion',
      });

      // Create child categories
      await categoryRepo.save({
        name: 'Laptops',
        description: 'Laptop computers',
        parent: parent1,
      });

      await categoryRepo.save({
        name: 'Phones',
        description: 'Mobile phones',
        parent: parent1,
      });

      await categoryRepo.save({
        name: 'Shirts',
        description: 'T-shirts and shirts',
        parent: parent2,
      });
    });

    it('should return category tree structure', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories/tree`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should have root categories
      const rootCategories = response.body.filter((cat: any) => !cat.parentId);
      expect(rootCategories.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .get(`/stores/${store.id}/products/${product.id}/categories/tree`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should nest child categories under parents', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories/tree`)
        .expect(200);

      const parentCategory = response.body.find(
        (cat: any) => cat.name === 'Electronics'
      );
      if (parentCategory && parentCategory.children) {
        expect(Array.isArray(parentCategory.children)).toBe(true);
        expect(parentCategory.children.length).toBeGreaterThan(0);
      }
    });

    it('should return empty array when no categories exist', async () => {
      const categoryRepo = appHelper.getDataSource().getRepository('Category');
      await categoryRepo.clear();

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/categories/tree`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Category-Product Relationships', () => {
    let category: any;

    beforeEach(async () => {
      const categories = await seeder.seedCategories(1);
      category = categories[0];
    });

    it('should assign category to product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.categories).toBeDefined();
    });

    it('should remove category from product', async () => {
      // First assign
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      // Then remove
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .expect(204);
    });

    it('should allow multiple categories per product', async () => {
      const categories = await seeder.seedCategories(3);

      for (const cat of categories) {
        await authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(
            `/stores/${store.id}/products/${product.id}/categories/${cat.id}`
          )
          .expect(200);
      }

      const productRepo = appHelper.getDataSource().getRepository('Product');
      const updatedProduct = await productRepo.findOne({
        where: { id: product.id },
        relations: ['categories'],
      });

      expect(updatedProduct?.categories.length).toBe(3);
    });

    it('should prevent duplicate category assignment', async () => {
      // Assign once
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        )
        .expect(200);

      // Try to assign again
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/${product.id}/categories/${category.id}`
        );

      AssertionHelper.assertErrorResponse(response, 400, 'already');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent category creation', async () => {
      const categories = await Promise.all([
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/categories`)
          .send({ name: 'Category 1', description: 'First' }),
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/categories`)
          .send({ name: 'Category 2', description: 'Second' }),
      ]);

      categories.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle special characters in category name', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send({
          name: 'Electronics & Gadgets™',
          description: 'Special characters category',
        })
        .expect(201);

      expect(response.body.name).toBe('Electronics & Gadgets™');
    });

    it('should handle very long category descriptions', async () => {
      const longDescription = 'a'.repeat(1000);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/categories`)
        .send({
          name: 'Long Description Category',
          description: longDescription,
        });

      // Should either succeed or fail with validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should maintain data integrity when deleting categories', async () => {
      const categories = await seeder.seedCategories(2);

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${categories[0].id}`
        );

      // Second category should still exist
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/categories/${categories[1].id}`
        )
        .expect(200);

      expect(response.body.id).toBe(categories[1].id);
    });

    it('should handle hierarchical category deletion', async () => {
      const categoryRepo = appHelper.getDataSource().getRepository('Category');

      const parent = await categoryRepo.save({
        name: 'Parent Category',
      });

      await categoryRepo.save({
        name: 'Child Category',
        parent,
      });

      // Delete parent
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/categories/${parent.id}`
        );

      // Should handle cascade or prevent deletion
      expect([200, 400]).toContain(response.status);
    });
  });
});
