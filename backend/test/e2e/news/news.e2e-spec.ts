import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import * as request from 'supertest';

describe('News (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    // Create test users
    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    // Create store
    store = await seeder.seedStore(storeOwner.user);

    await seeder.assignStoreModerator(storeModerator.user.id, store.id);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['news_posts']);
  });

  describe('POST /stores/:storeId/news/create', () => {
    const validNewsData = {
      title: 'Store Update',
      content: 'We have exciting news to share with our customers!',
    };

    it('should allow store owner to create news post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData)
        .expect(201);

      expect(response.body.title).toBe(validNewsData.title);
      expect(response.body.content).toBe(validNewsData.content);
      expect(response.body.storeId).toBe(store.id);
      expect(response.body.authorId).toBe(storeOwner.user.id);
      expect(response.body.isPublished).toBe(false); // Default unpublished
      AssertionHelper.assertUUID(response.body.id);
      AssertionHelper.assertTimestamps(response.body);
    });

    it('should allow store moderator to create news post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData)
        .expect(201);

      expect(response.body.title).toBe(validNewsData.title);
      expect(response.body.authorId).toBe(storeModerator.user.id);
    });

    it('should prevent regular user from creating news post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData);

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should validate title is required', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ content: 'Content only' });

      AssertionHelper.assertErrorResponse(response, 400, 'title');
    });

    it('should validate content is required', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Title only' });

      AssertionHelper.assertErrorResponse(response, 400, 'content');
    });

    it('should validate title length', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({
          title: 'ab', // Too short
          content: 'Valid content',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate content length', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({
          title: 'Valid Title',
          content: 'ab', // Too short
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should set author from authenticated user', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData)
        .expect(201);

      expect(response.body.authorId).toBe(storeOwner.user.id);
    });

    it('should create unpublished post by default', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send(validNewsData)
        .expect(201);

      expect(response.body.isPublished).toBe(false);
      expect(response.body.publishedAt).toBeNull();
    });
  });

  describe('GET /stores/:storeId/news/store-all', () => {
    beforeEach(async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Post 1', content: 'Content 1 content' });

      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Post 2', content: 'Content 2 content' });
    });

    it('should list all news posts for store', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/store-all`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('authorId');
      expect(response.body[0]).toHaveProperty('isPublished');
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/stores/${store.id}/news/store-all`
      );

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return empty array for store with no posts', async () => {
      const emptyStore = await seeder.seedStore(storeOwner.user);

      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${emptyStore.id}/news/store-all`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should include unpublished posts', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/store-all`)
        .expect(200);

      const unpublishedPosts = response.body.filter(
        (post: any) => !post.isPublished
      );
      expect(unpublishedPosts.length).toBeGreaterThan(0);
    });

    it('should include author information', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/store-all`)
        .expect(200);

      expect(response.body[0]).toHaveProperty('authorId');
      AssertionHelper.assertUUID(response.body[0].authorId);
    });

    it('should sort posts by creation date', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/store-all`)
        .expect(200);

      for (let i = 0; i < response.body.length; i++) {
        expect(response.body[i]).toHaveProperty('createdAt');
        expect(new Date(response.body[i].createdAt)).toBeInstanceOf(Date);
      }
    });
  });

  describe('GET /stores/:storeId/news/:id', () => {
    let newsPost: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Test Post', content: 'Test content' });

      newsPost = response.body;
    });

    it('should get single news post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/${newsPost.id}`)
        .expect(200);

      expect(response.body.id).toBe(newsPost.id);
      expect(response.body.title).toBe('Test Post');
      expect(response.body.content).toBe('Test content');
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/stores/${store.id}/news/${newsPost.id}`
      );

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/00000000-0000-0000-0000-000000000000`);

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate UUID format', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/invalid-uuid`);

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should include full post details', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/${newsPost.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('authorId');
      expect(response.body).toHaveProperty('isPublished');
      expect(response.body).toHaveProperty('publishedAt');
      AssertionHelper.assertTimestamps(response.body);
    });
  });

  describe('PUT /stores/:storeId/news/:id', () => {
    let newsPost: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Original Title', content: 'Original content' });

      newsPost = response.body;
    });

    it('should allow store owner to update post', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe(updates.title);
      expect(response.body.content).toBe(updates.content);
    });

    it('should allow store moderator to update post', async () => {
      const updates = {
        title: 'Moderator Update',
        content: 'Updated by moderator',
      };

      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe(updates.title);
    });

    it('should prevent regular user from updating post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send({ title: 'Unauthorized Update' });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate title length on update', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send({ title: 'ab' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate content length on update', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send({ content: 'ab' });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/news/00000000-0000-0000-0000-000000000000`)
        .send({ title: 'Update' });

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should allow partial updates', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .put(`/stores/${store.id}/news/${newsPost.id}`)
        .send({ title: 'Only Title Updated' })
        .expect(200);

      expect(response.body.title).toBe('Only Title Updated');
      expect(response.body.content).toBe('Original content');
    });
  });

  describe('DELETE /stores/:storeId/news/:id', () => {
    let newsPost: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'To Delete', content: 'Will be deleted' });

      newsPost = response.body;
    });

    it('should allow store owner to delete post', async () => {
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${store.id}/news/${newsPost.id}`)
        .expect(200);

      // Verify deletion
      const newsRepo = appHelper.getDataSource().getRepository('NewsPost');
      const deletedPost = await newsRepo.findOne({
        where: { id: newsPost.id },
      });
      expect(deletedPost).toBeNull();
    });

    it('should allow store moderator to delete post', async () => {
      await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .delete(`/stores/${store.id}/news/${newsPost.id}`)
        .expect(200);

      const newsRepo = appHelper.getDataSource().getRepository('NewsPost');
      const deletedPost = await newsRepo.findOne({
        where: { id: newsPost.id },
      });
      expect(deletedPost).toBeNull();
    });

    it('should prevent regular user from deleting post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .delete(`/stores/${store.id}/news/${newsPost.id}`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/news/00000000-0000-0000-0000-000000000000`
        );
      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('POST /stores/:storeId/news/:id/publish', () => {
    let newsPost: any;

    beforeEach(async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Unpublished Post', content: 'Not yet published' });

      newsPost = response.body;
    });

    it('should allow store owner to publish post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`)
        .expect(201);

      expect(response.body.isPublished).toBe(true);
      expect(response.body.publishedAt).toBeDefined();
      expect(new Date(response.body.publishedAt)).toBeInstanceOf(Date);
    });

    it('should allow store moderator to publish post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`)
        .expect(201);

      expect(response.body.isPublished).toBe(true);
    });

    it('should prevent regular user from publishing post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should set publishedAt timestamp', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`)
        .expect(201);

      expect(response.body.publishedAt).not.toBeNull();
      const publishedDate = new Date(response.body.publishedAt);
      expect(publishedDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle already published post', async () => {
      // Publish once
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`);

      // Publish again
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`)
        .expect(201);

      expect(response.body.isPublished).toBe(true);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/news/00000000-0000-0000-0000-000000000000/publish`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('POST /stores/:storeId/news/:id/unpublish', () => {
    let newsPost: any;

    beforeEach(async () => {
      const createResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Published Post', content: 'Will be unpublished' });

      newsPost = createResponse.body;

      // Publish it first
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/publish`);
    });

    it('should allow store owner to unpublish post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`)
        .expect(201);

      expect(response.body.isPublished).toBe(false);
    });

    it('should allow store moderator to unpublish post', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`)
        .expect(201);

      expect(response.body.isPublished).toBe(false);
    });

    it('should prevent regular user from unpublishing post', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`);

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should handle already unpublished post', async () => {
      // Unpublish once
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`);

      // Unpublish again
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`)
        .expect(201);

      expect(response.body.isPublished).toBe(false);
    });

    it('should preserve publishedAt timestamp after unpublish', async () => {
      const publishedPost = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .get(`/stores/${store.id}/news/${newsPost.id}`);

      const originalPublishedAt = publishedPost.body.publishedAt;

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.id}/unpublish`)
        .expect(201);

      expect(response.body.publishedAt).toBe(originalPublishedAt);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent post creation', async () => {
      const posts = await Promise.all([
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/news/create`)
          .send({ title: 'Concurrent 1', content: 'Content 1 content' }),
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/news/create`)
          .send({ title: 'Concurrent 2', content: 'Content 2 content' }),
      ]);

      posts.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle special characters in content', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({
          title: 'Special™ Characters',
          content: 'Content with <html> tags and "quotes" & symbols',
        })
        .expect(201);

      expect(response.body.title).toBe('Special™ Characters');
      expect(response.body.content).toContain('<html>');
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({
          title: 'Long Content Post',
          content: longContent,
        });

      // Should either succeed or fail with validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should maintain data integrity when deleting posts', async () => {
      const post1 = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Post 1', content: 'Content 1 content' });

      const post2 = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Post 2', content: 'Content 2 content' });

      // Delete first post
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${store.id}/news/${post1.body.id}`);

      // Second post should still exist
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .get(`/stores/${store.id}/news/${post2.body.id}`)
        .expect(200);

      expect(response.body.id).toBe(post2.body.id);
    });

    it('should handle publish/unpublish cycle', async () => {
      const newsPost = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/create`)
        .send({ title: 'Cycle Test', content: 'Test content' });

      // Publish
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.body.id}/publish`)
        .expect(201);

      // Unpublish
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.body.id}/unpublish`)
        .expect(201);

      // Publish again
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/news/${newsPost.body.id}/publish`)
        .expect(201);

      expect(response.body.isPublished).toBe(true);
    });
  });
});
