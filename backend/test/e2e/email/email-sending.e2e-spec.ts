import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { EmailModule } from 'src/modules/email/email.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Email - Sending (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;

  let adminUser: any;
  let storeOwner: any;
  let storeModerator: any;
  let regularUser: any;

  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [EmailModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    adminUser = await authHelper.createAdminUser();
    storeOwner = await authHelper.createAuthenticatedUser();
    storeModerator = await authHelper.createAuthenticatedUser();
    regularUser = await authHelper.createAuthenticatedUser();

    store = await seeder.seedStore(storeOwner.user);

    await seeder.assignStoreModerator(storeModerator.user.id, store.id);
  });

  afterAll(async () => {
    await appHelper.cleanup();
  });

  describe('POST /email/send', () => {
    it('should send custom email as admin', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'test@example.com', name: 'Test User' }],
          subject: 'Test Email',
          html: '<p>This is a test email</p>',
          text: 'This is a test email',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('sentAt');
    });

    it('should prevent non-admin from sending custom emails', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'test@example.com', name: 'Test User' }],
          subject: 'Test Email',
          html: '<p>Test</p>',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          subject: 'Test Email',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should validate email addresses', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'invalid-email', name: 'Test' }],
          subject: 'Test',
          html: '<p>Test</p>',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should support multiple recipients', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [
            { email: 'user1@example.com', name: 'User 1' },
            { email: 'user2@example.com', name: 'User 2' },
          ],
          subject: 'Test Multiple Recipients',
          html: '<p>Test</p>',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should support CC and BCC', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'primary@example.com', name: 'Primary' }],
          cc: [{ email: 'cc@example.com', name: 'CC' }],
          bcc: [{ email: 'bcc@example.com', name: 'BCC' }],
          subject: 'Test CC/BCC',
          html: '<p>Test</p>',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should support attachments', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/send')
        .send({
          to: [{ email: 'test@example.com', name: 'Test' }],
          subject: 'Test Attachments',
          html: '<p>Test</p>',
          attachments: [
            {
              filename: 'test.txt',
              content: 'Test file content',
              contentType: 'text/plain',
            },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /email/user-confirmation', () => {
    it('should send user confirmation email', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/user-confirmation')
        .send({
          userEmail: regularUser.user.email,
          userName: regularUser.user.firstName,
          confirmationUrl: 'https://example.com/confirm/abc123',
          storeName: store.name,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('scheduledAt');
    });

    it('should prevent regular user', async () => {
      const response = await authHelper
        .authenticatedRequest(regularUser.accessToken)
        .post('/email/user-confirmation')
        .send({
          userEmail: 'test@example.com',
          userName: 'Test',
          confirmationUrl: 'https://example.com/confirm/123',
          storeName: store.name,
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate required fields', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/user-confirmation')
        .send({
          userName: 'Test',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /email/welcome', () => {
    it('should send welcome email', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/welcome')
        .send({
          userEmail: regularUser.user.email,
          userName: regularUser.user.firstName,
          storeUrl: `https://example.com/stores/${store.id}`,
          storeName: store.name,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
    });

    it('should validate email format', async () => {
      const response = await authHelper
        .authenticatedRequest(adminUser.accessToken)
        .post('/email/welcome')
        .send({
          userEmail: 'invalid-email',
          userName: 'Test',
          storeUrl: 'https://example.com',
          storeName: store.name,
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /email/stock-alert', () => {
    it('should send stock alert email', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/email/${store.id}/stock-alert`)
        .send({
          userEmail: regularUser.user.email,
          userName: regularUser.user.firstName,
          productData: {
            name: 'Blue T-Shirt',
            price: '$29.99',
            stockQuantity: 10,
            url: 'https://example.com/products/123',
            image: 'https://example.com/images/product.jpg',
            description: 'Back in stock!',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should require product data', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/email/${store.id}/stock-alert`)
        .send({
          userEmail: regularUser.user.email,
          userName: 'Test',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });

  describe('POST /email/low-stock-warning', () => {
    it('should send low stock warning', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/email/${store.id}/low-stock-warning`)
        .send({
          storeOwnerEmail: storeOwner.user.email,
          storeOwnerName: storeOwner.user.firstName,
          productData: {
            name: 'Blue T-Shirt',
            sku: 'TSHIRT-BLU-M',
            category: 'Clothing',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
          },
          manageInventoryUrl: `https://example.com/stores/${store.id}/inventory`,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role', async () => {
      const response = await authHelper
        .authenticatedRequest(storeModerator.accessToken)
        .post(`/email/${store.id}/low-stock-warning`)
        .send({
          storeOwnerEmail: 'test@example.com',
          storeOwnerName: 'Test',
          productData: {
            name: 'Product',
            sku: 'SKU-123',
            category: 'Category',
            currentStock: 5,
            threshold: 10,
            recentSales: 15,
            estimatedDays: 2,
          },
          manageInventoryUrl: 'https://example.com',
        });

      AssertionHelper.assertErrorResponse(response, 403);
    });

    it('should validate product data fields', async () => {
      const response = await authHelper
        .authenticatedRequest(storeOwner.accessToken)
        .post(`/email/${store.id}/low-stock-warning`)
        .send({
          storeOwnerEmail: storeOwner.user.email,
          storeOwnerName: 'Test',
          productData: {
            name: 'Product',
          },
          manageInventoryUrl: 'https://example.com',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });
  });
});
