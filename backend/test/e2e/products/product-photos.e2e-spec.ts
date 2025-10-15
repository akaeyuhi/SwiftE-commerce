import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { ProductsModule } from 'src/modules/products/products.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Products - Photos (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let storeOwner: any;
  let store: any;
  let product: any;

  // Create test image buffer
  const createTestImageBuffer = (): Buffer =>
    // Simple 1x1 PNG image
    Buffer.from(
      `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      'base64'
    );
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
    await appHelper.clearTables(['product_photos']);
  });

  describe('POST /stores/:storeId/products (with photos)', () => {
    it('should create product with main photo', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .field('name', 'Product with Photo')
        .field('description', 'Has a main photo')
        .attach('mainPhoto', createTestImageBuffer(), 'main.png')
        .expect(201);

      expect(response.body.name).toBe('Product with Photo');
      expect(response.body).toHaveProperty('mainPhotoUrl');
    });

    it('should create product with multiple photos', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .field('name', 'Product with Photos')
        .field('description', 'Has multiple photos')
        .attach('photos', createTestImageBuffer(), 'photo1.png')
        .attach('photos', createTestImageBuffer(), 'photo2.png')
        .expect(201);

      expect(response.body.name).toBe('Product with Photos');
      expect(response.body).toHaveProperty('photos');
      expect(response.body.photos.length).toBeGreaterThanOrEqual(2);
    });

    it('should create product with both main photo and additional photos', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .field('name', 'Full Product')
        .field('description', 'Complete with all photos')
        .attach('mainPhoto', createTestImageBuffer(), 'main.png')
        .attach('photos', createTestImageBuffer(), 'photo1.png')
        .attach('photos', createTestImageBuffer(), 'photo2.png')
        .expect(201);

      expect(response.body).toHaveProperty('mainPhotoUrl');
      expect(response.body.photos.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate image file types', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .field('name', 'Product')
        .attach('mainPhoto', Buffer.from('not an image'), 'file.txt');

      // Should reject non-image files
      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate image file size', async () => {
      // Create a large buffer (> max size)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products`)
        .field('name', 'Product')
        .attach('mainPhoto', largeBuffer, 'large.png');

      // Should reject oversized files
      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /stores/:storeId/products/:id/photos', () => {
    it('should add photos to existing product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`)
        .attach('photos', createTestImageBuffer(), 'photo1.png')
        .attach('photos', createTestImageBuffer(), 'photo2.png')
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.photos).toBeDefined();
      expect(response.body.photos.length).toBeGreaterThanOrEqual(2);
    });

    it('should require at least one photo', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`);

      AssertionHelper.assertErrorResponse(response, 400, 'No photos uploaded');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/00000000-0000-0000-0000-000000000000/photos`
        )
        .attach('photos', createTestImageBuffer(), 'photo.png');

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should handle multiple photo uploads', async () => {
      const photoCount = 5;
      let req = authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`);

      for (let i = 0; i < photoCount; i++) {
        req = req.attach('photos', createTestImageBuffer(), `photo${i}.png`);
      }

      const response = await req.expect(201);

      expect(response.body.photos.length).toBe(photoCount);
    });
  });

  describe('POST /stores/:storeId/products/:id/photos/main', () => {
    it('should set main photo for product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos/main`)
        .attach('photo', createTestImageBuffer(), 'main.png')
        .expect(201);

      expect(response.body).toHaveProperty('mainPhotoUrl');
      expect(response.body.mainPhotoUrl).toBeTruthy();
    });

    it('should require photo file', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos/main`);

      AssertionHelper.assertErrorResponse(response, 400, 'No photo uploaded');
    });

    it('should replace existing main photo', async () => {
      // Upload first main photo
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos/main`)
        .attach('photo', createTestImageBuffer(), 'main1.png')
        .expect(201);

      // Replace with second main photo
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos/main`)
        .attach('photo', createTestImageBuffer(), 'main2.png')
        .expect(201);

      expect(response.body.mainPhotoUrl).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(
          `/stores/${store.id}/products/00000000-0000-0000-0000-000000000000/photos/main`
        )
        .attach('photo', createTestImageBuffer(), 'main.png');

      AssertionHelper.assertErrorResponse(response, 404);
    });
  });

  describe('DELETE /stores/:storeId/products/:productId/photos/:photoId', () => {
    it('should delete a product photo', async () => {
      // First add a photo
      const addResponse = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`)
        .attach('photos', createTestImageBuffer(), 'photo.png')
        .expect(201);

      const photoId = addResponse.body.photos[0].id;

      // Then delete it
      await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(`/stores/${store.id}/products/${product.id}/photos/${photoId}`)
        .expect(204);

      // Verify deletion
      const photoRepo = appHelper.getDataSource().getRepository('ProductPhoto');
      const deletedPhoto = await photoRepo.findOne({ where: { id: photoId } });
      expect(deletedPhoto).toBeNull();
    });

    it('should return 404 for non-existent photo', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/photos/00000000-0000-0000-0000-000000000000`
        );

      AssertionHelper.assertErrorResponse(response, 404);
    });

    it('should validate photo UUID', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .delete(
          `/stores/${store.id}/products/${product.id}/photos/invalid-uuid`
        );

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('Photo URL generation', () => {
    it('should generate accessible photo URLs', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos/main`)
        .attach('photo', createTestImageBuffer(), 'test.png')
        .expect(201);

      expect(response.body.mainPhotoUrl).toBeDefined();
      expect(typeof response.body.mainPhotoUrl).toBe('string');
      expect(response.body.mainPhotoUrl).toMatch(/^https?:\/\//);
    });

    it('should include photo metadata', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`)
        .attach('photos', createTestImageBuffer(), 'photo.png')
        .expect(201);

      const photo = response.body.photos[0];
      expect(photo).toHaveProperty('id');
      expect(photo).toHaveProperty('url');
      AssertionHelper.assertUUID(photo.id);
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent photo uploads', async () => {
      const uploads = [
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/photos`)
          .attach('photos', createTestImageBuffer(), 'photo1.png'),
        authHelper
          .authenticatedRequest(storeOwner.accessToken)
          .post(`/stores/${store.id}/products/${product.id}/photos`)
          .attach('photos', createTestImageBuffer(), 'photo2.png'),
      ];

      const responses = await Promise.all(uploads);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should require authentication for photo operations', async () => {
      const response = await request(app.getHttpServer())
        .post(`/stores/${store.id}/products/${product.id}/photos`)
        .attach('photos', createTestImageBuffer(), 'photo.png');

      AssertionHelper.assertErrorResponse(response, 401);
    });

    it('should require store ownership for photo operations', async () => {
      const anotherUser = await authHelper.createAuthenticatedUser();

      const response = await authHelper
        .authenticatedRequest(anotherUser.accessToken)
        .post(`/stores/${store.id}/products/${product.id}/photos`)
        .attach('photos', createTestImageBuffer(), 'photo.png');

      AssertionHelper.assertErrorResponse(response, 403);
    });
  });
});
