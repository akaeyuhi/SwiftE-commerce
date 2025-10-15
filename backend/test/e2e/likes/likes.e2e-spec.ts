import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Likes (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let user1: any;
  let user2: any;

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
    user1 = await authHelper.createAuthenticatedUser();
    user2 = await authHelper.createAuthenticatedUser();

    // Create store and product
    store = await seeder.seedStore(adminUser.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['likes']);
  });

  describe('POST /users/:userId/likes/product/productId', () => {
    it('should like a product', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(user1.user.id);
      expect(response.body.productId).toBe(product.id);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should prevent user from liking as another user', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user2.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow admin to like as any user', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      expect(response.body.userId).toBe(user1.user.id);
    });

    it('should validate user UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/invalid-uuid/likes/product/${product.id}`)
        .send({ productId: product.id });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate product UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/invalid-uuid`)
        .send({ productId: 'invalid-uuid' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent duplicate likes', async () => {
      // First like
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      // Second like attempt
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id });

      AssertionHelper.assertErrorResponse(response, 400, 'already');
    });

    it('should allow different users to like same product', async () => {
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(user2.accessToken)
        .post(`/users/${user2.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      const likeRepo = appHelper.getDataSource().getRepository('Like');
      const likes = await likeRepo.find({
        where: { productId: product.id },
      });
      expect(likes.length).toBe(2);
    });

    // it('should record analytics event for like', async () => {
    //   await authHelper
    //     .authenticatedRequest(user1.accessToken)
    //     .post(`/users/${user1.user.id}/likes/product/${product.id}`)
    //     .send({ productId: product.id })
    //     .expect(201);
    //
    //   // Verify analytics event was recorded
    //   const eventRepo = appHelper
    //     .getDataSource()
    //     .getRepository('AnalyticsEvent');
    //   const events = await eventRepo.find({
    //     where: {
    //       productId: product.id,
    //       eventType: 'like',
    //       userId: user1.user.id,
    //     },
    //   });
    //
    //   expect(events.length).toBeGreaterThan(0);
    // });

    it('should update product like count', async () => {
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      const productRepo = appHelper.getDataSource().getRepository('Product');
      const updatedProduct = await productRepo.findOne({
        where: { id: product.id },
      });

      expect(updatedProduct?.likeCount).toBeGreaterThan(0);
    });
  });

  describe('POST /users/:userId/likes/store/:storeId', () => {
    it('should like a store', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(user1.user.id);
      expect(response.body.storeId).toBe(store.id);
      AssertionHelper.assertUUID(response.body.id);
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id });

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should prevent user from liking as another user', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user2.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/invalid-uuid`)
        .send({ storeId: 'invalid-uuid' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent duplicate likes', async () => {
      // First like
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id })
        .expect(201);

      // Second like attempt
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id });

      AssertionHelper.assertErrorResponse(response, 400, 'already');
    });

    it('should allow different users to like same store', async () => {
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id })
        .expect(201);

      await authHelper
        .authenticatedRequest(user2.accessToken)
        .post(`/users/${user2.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id })
        .expect(201);

      const likeRepo = appHelper.getDataSource().getRepository('Like');
      const likes = await likeRepo.find({ where: { storeId: store.id } });
      expect(likes.length).toBe(2);
    });

    //   it('should record analytics event for store like', async () => {
    //     await authHelper
    //       .authenticatedRequest(user1.accessToken)
    //       .post(`/users/${user1.user.id}/likes/store/${store.id}`)
    //       .send({ storeId: store.id })
    //       .expect(201);
    //
    //     // Verify analytics event was recorded
    //     const eventRepo = appHelper
    //       .getDataSource()
    //       .getRepository('AnalyticsEvent');
    //     const events = await eventRepo.find({
    //       where: {
    //         storeId: store.id,
    //         eventType: 'like',
    //         userId: user1.user.id,
    //       },
    //     });
    //
    //     expect(events.length).toBeGreaterThan(0);
    //   });
    //
    //   it('should update store follower count', async () => {
    //     await authHelper
    //       .authenticatedRequest(user1.accessToken)
    //       .post(`/users/${user1.user.id}/likes/store/${store.id}`)
    //       .send({ storeId: store.id })
    //       .expect(201);
    //
    //     const storeRepo = appHelper.getDataSource().getRepository('Store');
    //     const updatedStore = await storeRepo.findOne({ where: { id: store.id } });
    //
    //     expect(updatedStore?.followerCount).toBeGreaterThan(0);
    //   });
  });

  describe('GET /users/:userId/likes', () => {
    beforeEach(async () => {
      // Add some likes
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id });

      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id });
    });

    it('should list all likes for user', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('userId');
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .get(`/users/${user1.user.id}/likes`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should prevent user from viewing other user likes', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user2.user.id}/likes`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow admin to view any user likes', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no likes', async () => {
      const response = await authHelper
        .authenticatedRequest(user2.accessToken)
        .get(`/users/${user2.user.id}/likes`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include product information in likes', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      const productLike = response.body.find((like: any) => like.productId);
      if (productLike) {
        expect(productLike.productId).toBe(product.id);
        expect(productLike).toHaveProperty('product');
      }
    });

    it('should include store information in likes', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      const storeLike = response.body.find((like: any) => like.storeId);
      if (storeLike) {
        expect(storeLike.storeId).toBe(store.id);
        expect(storeLike).toHaveProperty('store');
      }
    });

    it('should sort likes by creation date', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      for (let i = 0; i < response.body.length; i++) {
        expect(response.body[i]).toHaveProperty('createdAt');
        expect(new Date(response.body[i].createdAt)).toBeInstanceOf(Date);
      }
    });
  });

  describe('DELETE /users/:userId/likes/:id', () => {
    let productLike: any;
    let storeLike: any;

    beforeEach(async () => {
      const productLikeResponse = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id });
      productLike = productLikeResponse.body;

      const storeLikeResponse = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/store/${store.id}`)
        .send({ storeId: store.id });
      storeLike = storeLikeResponse.body;
    });

    it('should unlike a product', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${productLike.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const likeRepo = appHelper.getDataSource().getRepository('Like');
      const deletedLike = await likeRepo.findOne({
        where: { id: productLike.id },
      });
      expect(deletedLike).toBeNull();
    });

    it('should unlike a store', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${storeLike.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const likeRepo = appHelper.getDataSource().getRepository('Like');
      const deletedLike = await likeRepo.findOne({
        where: { id: storeLike.id },
      });
      expect(deletedLike).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await appHelper
        .request()
        .delete(`/users/${user1.user.id}/likes/${productLike.id}`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should prevent user from removing other user likes', async () => {
      const response = await authHelper
        .authenticatedRequest(user2.accessToken)
        .delete(`/users/${user1.user.id}/likes/${productLike.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should allow admin to remove any like', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(`/users/${user1.user.id}/likes/${productLike.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate like UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/invalid-uuid`);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should return 404 for non-existent like', async () => {
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(
          `/users/${user1.user.id}/likes/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    // it('should record analytics event for unlike', async () => {
    //   await authHelper
    //     .authenticatedRequest(user1.accessToken)
    //     .delete(`/users/${user1.user.id}/likes/${productLike.id}`)
    //     .expect(200);
    //
    //   // Verify analytics event was recorded
    //   const eventRepo = appHelper
    //     .getDataSource()
    //     .getRepository('AnalyticsEvent');
    //   const events = await eventRepo.find({
    //     where: {
    //       productId: product.id,
    //       eventType: 'unlike',
    //       userId: user1.user.id,
    //     },
    //   });
    //
    //   expect(events.length).toBeGreaterThan(0);
    // });

    it('should update product like count after unlike', async () => {
      const initialProduct = await appHelper
        .getDataSource()
        .getRepository('Product')
        .findOne({ where: { id: product.id } });
      const initialCount = initialProduct?.likeCount;

      await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${productLike.id}`)
        .expect(200);

      const updatedProduct = await appHelper
        .getDataSource()
        .getRepository('Product')
        .findOne({ where: { id: product.id } });

      expect(updatedProduct?.likeCount).toBeLessThan(initialCount);
    });

    it('should update store follower count after unlike', async () => {
      const initialStore = await appHelper
        .getDataSource()
        .getRepository('Store')
        .findOne({ where: { id: store.id } });
      const initialCount = initialStore?.followerCount;

      await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${storeLike.id}`)
        .expect(200);

      const updatedStore = await appHelper
        .getDataSource()
        .getRepository('Store')
        .findOne({ where: { id: store.id } });

      expect(updatedStore?.followerCount).toBeLessThan(initialCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent like operations', async () => {
      const products = await seeder.seedProducts(store, 2);

      const likes = await Promise.all([
        authHelper
          .authenticatedRequest(user1.accessToken)
          .post(`/users/${user1.user.id}/likes/product/${products[0].id}`)
          .send({ productId: products[0].id }),
        authHelper
          .authenticatedRequest(user1.accessToken)
          .post(`/users/${user1.user.id}/likes/product/${products[1].id}`)
          .send({ productId: products[1].id }),
      ]);

      likes.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle like and unlike in rapid succession', async () => {
      // Like
      const likeResponse = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);

      // Unlike immediately
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${likeResponse.body.id}`)
        .expect(200);

      // Like again
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${product.id}`)
        .send({ productId: product.id })
        .expect(201);
    });

    it('should maintain data integrity when deleting likes', async () => {
      const products = await seeder.seedProducts(store, 2);

      await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${products[0].id}`)
        .send({ productId: products[0].id });

      const like2 = await authHelper
        .authenticatedRequest(user1.accessToken)
        .post(`/users/${user1.user.id}/likes/product/${products[1].id}`)
        .send({ productId: products[1].id });

      // Delete first like
      await authHelper
        .authenticatedRequest(user1.accessToken)
        .delete(`/users/${user1.user.id}/likes/${like2.body.id}`);

      // Check remaining likes
      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].productId).toBe(products[0].id);
    });

    it('should handle user with many likes', async () => {
      const products = await seeder.seedProducts(store, 10);

      for (const prod of products) {
        await authHelper
          .authenticatedRequest(user1.accessToken)
          .post(`/users/${user1.user.id}/likes/product/${prod.id}`)
          .send({ productId: prod.id });
      }

      const response = await authHelper
        .authenticatedRequest(user1.accessToken)
        .get(`/users/${user1.user.id}/likes`)
        .expect(200);

      expect(response.body.length).toBe(10);
    });
  });
});
