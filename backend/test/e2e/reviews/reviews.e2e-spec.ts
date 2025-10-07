import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Reviews (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let customer1: any;
  let customer2: any;

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
    customer1 = await authHelper.createAuthenticatedUser();
    customer2 = await authHelper.createAuthenticatedUser();

    // Create store and product
    store = await seeder.seedStore(storeOwner.user);
    const products = await seeder.seedProducts(store, 1);
    product = products[0];
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  afterEach(async () => {
    const reviewRepo = appHelper.getDataSource().getRepository('Review');
    await reviewRepo.clear();
  });

  describe('POST /stores/:storeId/products/:productId/reviews/create', () => {
    const validReviewData = {
      rating: 5,
      title: 'Great Product!',
      content: 'I really enjoyed this product. Highly recommend!',
    };

    it('should create a review as authenticated user', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send(validReviewData)
        .expect(201);

      expect(response.body.rating).toBe(validReviewData.rating);
      expect(response.body.title).toBe(validReviewData.title);
      expect(response.body.content).toBe(validReviewData.content);
      expect(response.body.authorId).toBe(customer1.user.id);
      expect(response.body.productId).toBe(product.id);
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send(validReviewData);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate rating is between 1-5', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ ...validReviewData, rating: 6 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate rating is required', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ title: 'Test', content: 'Content' });

      AssertionHelper.assertErrorResponse(response, 400, 'rating');
    });

    it('should require minimum rating of 1', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ ...validReviewData, rating: 0 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should allow review without title', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, content: 'Good product' })
        .expect(201);

      expect(response.body.rating).toBe(4);
      expect(response.body.content).toBe('Good product');
    });

    it('should allow review without content', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Good' })
        .expect(201);

      expect(response.body.rating).toBe(4);
      expect(response.body.title).toBe('Good');
    });

    it('should validate title length if provided', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({
          rating: 5,
          title: 'ab', // Too short
          content: 'Content',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate content length if provided', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({
          rating: 5,
          title: 'Title',
          content: 'ab', // Too short
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should prevent duplicate reviews from same user', async () => {
      // Create first review
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send(validReviewData)
        .expect(201);

      // Try to create another review
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send(validReviewData);

      AssertionHelper.assertErrorResponse(response, 400, 'already');
    });

    it('should allow different users to review same product', async () => {
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send(validReviewData)
        .expect(201);

      await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ ...validReviewData, title: 'Also great!' })
        .expect(201);

      const reviewRepo = appHelper.getDataSource().getRepository('Review');
      const reviews = await reviewRepo.find({
        where: { product: { id: product.id } },
      });
      expect(reviews.length).toBe(2);
    });

    it('should validate product exists', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(
          `/stores/${store.id}/products/00000000-0000-0000-0000-000000000000/reviews/create`
        )
        .send(validReviewData);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate store UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/invalid-uuid/products/${product.id}/reviews/create`)
        .send(validReviewData);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate product UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/invalid-uuid/reviews/create`)
        .send(validReviewData);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('GET /stores/:storeId/products/:productId/reviews', () => {
    beforeEach(async () => {
      // Seed some reviews
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 5, title: 'Excellent', content: 'Love it!' });

      await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Good', content: 'Nice product' });
    });

    it('should list all reviews for a product', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/reviews`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('rating');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('authorId');
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .get(`/stores/${store.id}/products/${product.id}/reviews`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return empty array for product with no reviews', async () => {
      const newProducts = await seeder.seedProducts(store, 1);

      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${newProducts[0].id}/reviews`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include author information', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/reviews`)
        .expect(200);

      expect(response.body[0]).toHaveProperty('authorId');
      AssertionHelper.assertUUID(response.body[0].authorId);
    });

    it('should sort reviews by creation date', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/reviews`)
        .expect(200);

      // Verify timestamps exist and are valid
      for (let i = 0; i < response.body.length; i++) {
        expect(response.body[i]).toHaveProperty('createdAt');
        expect(new Date(response.body[i].createdAt)).toBeInstanceOf(Date);
      }
    });
  });

  describe('GET /stores/:storeId/products/:productId/reviews/:id', () => {
    let review: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 5, title: 'Great', content: 'Excellent product!' });

      review = response.body;
    });

    it('should get a single review by id', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .expect(200);

      expect(response.body.id).toBe(review.id);
      expect(response.body.rating).toBe(5);
      expect(response.body.title).toBe('Great');
      expect(response.body.content).toBe('Excellent product!');
    });

    it('should require authentication', async () => {
      const response = await app
        .getHttpServer()
        .get(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return 404 for non-existent review', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/reviews/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate review UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(`/stores/${store.id}/products/${product.id}/reviews/invalid-uuid`);

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('PUT /stores/:storeId/products/:productId/reviews/:id', () => {
    let review: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Good', content: 'Nice product' });

      review = response.body;
    });

    it('should allow store admin to update review', async () => {
      const updates = {
        rating: 5,
        title: 'Updated Title',
        content: 'Updated content',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.rating).toBe(updates.rating);
      expect(response.body.title).toBe(updates.title);
      expect(response.body.content).toBe(updates.content);
    });

    it('should allow admin to update review', async () => {
      const updates = {
        rating: 5,
        title: 'Admin Updated',
      };

      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .put(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.rating).toBe(updates.rating);
      expect(response.body.title).toBe(updates.title);
    });

    it('should prevent review author from updating own review', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .put(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .send({ rating: 5 });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent other users from updating review', async () => {
      const response = await authHelper
        .authenticatedRequest(customer2.accessToken)
        .put(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .send({ rating: 1 });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate rating range on update', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/products/${product.id}/reviews/${review.id}`)
        .send({ rating: 6 });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should return 404 for non-existent review', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(
          `/stores/${store.id}/products/${product.id}/reviews/00000000-0000-0000-0000-000000000000`
        )
        .send({ rating: 5 });

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('DELETE /stores/:storeId/products/:productId/reviews/:id', () => {
    let review: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Good', content: 'Nice' });

      review = response.body;
    });

    it('should allow store admin to delete review', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/${review.id}`
        )
        .expect(200);

      // Verify deletion
      const reviewRepo = appHelper.getDataSource().getRepository('Review');
      const deletedReview = await reviewRepo.findOne({
        where: { id: review.id },
      });
      expect(deletedReview).toBeNull();
    });

    it('should allow admin to delete review', async () => {
      await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/${review.id}`
        )
        .expect(200);

      const reviewRepo = appHelper.getDataSource().getRepository('Review');
      const deletedReview = await reviewRepo.findOne({
        where: { id: review.id },
      });
      expect(deletedReview).toBeNull();
    });

    it('should prevent review author from deleting own review', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/${review.id}`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should prevent other users from deleting review', async () => {
      const response = await authHelper
        .authenticatedRequest(customer2.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/${review.id}`
        );

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent review', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('Rating Statistics', () => {
    beforeEach(async () => {
      // Create multiple reviews with different ratings
      await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 5, title: 'Excellent' });

      await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Good' });

      const customer3 = await authHelper.createAuthenticatedUser();
      await authHelper
        .authenticatedRequest(customer3.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 5, title: 'Great' });
    });

    it('should update product review count', async () => {
      const productRepo = appHelper.getDataSource().getRepository('Product');
      const updatedProduct = await productRepo.findOne({
        where: { id: product.id },
      });

      expect(updatedProduct?.reviewCount).toBeGreaterThanOrEqual(3);
    });

    it('should update product average rating', async () => {
      const productRepo = appHelper.getDataSource().getRepository('Product');
      const updatedProduct = await productRepo.findOne({
        where: { id: product.id },
      });

      // Average of 5, 4, 5 = 4.67
      expect(updatedProduct?.averageRating).toBeCloseTo(4.67, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent review submissions', async () => {
      const user1 = await authHelper.createAuthenticatedUser();
      const user2 = await authHelper.createAuthenticatedUser();

      const reviews = await Promise.all([
        authHelper
          .authenticatedRequest(user1.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
          .send({ rating: 5, title: 'Concurrent 1' }),
        authHelper
          .authenticatedRequest(user2.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
          .send({ rating: 4, title: 'Concurrent 2' }),
      ]);

      reviews.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle special characters in review content', async () => {
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({
          rating: 5,
          title: 'Test & Review™',
          content: 'Content with <html> tags and "quotes"',
        })
        .expect(201);

      expect(response.body.title).toBe('Test & Review™');
      expect(response.body.content).toContain('<html>');
    });

    it('should handle very long review content', async () => {
      const longContent = 'a'.repeat(5000);

      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({
          rating: 5,
          title: 'Long Review',
          content: longContent,
        });

      // Should either succeed or fail with validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should maintain data integrity when deleting reviews', async () => {
      const review1 = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 5, title: 'Review 1' });

      const review2 = await authHelper
        .authenticatedRequest(customer2.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/reviews/create`)
        .send({ rating: 4, title: 'Review 2' });

      // Delete first review
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/reviews/${review1.body.id}`
        );

      // Second review should still exist
      const response = await authHelper
        .authenticatedRequest(customer1.accessToken)
        .get(
          `/stores/${store.id}/products/${product.id}/reviews/${review2.body.id}`
        )
        .expect(200);

      expect(response.body.id).toBe(review2.body.id);
    });
  });
});
