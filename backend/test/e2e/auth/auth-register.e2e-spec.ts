import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AssertionHelper } from '../helpers/assertion.helper';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';

describe('Auth - Registration (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [AuthModule, UserModule],
    });
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['users', 'confirmations', 'refresh_tokens']);
  });

  describe('POST /auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test123!@#',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.firstName).toBe(validUserData.firstName);
      expect(response.body.user.lastName).toBe(validUserData.lastName);
      expect(response.body.user).not.toHaveProperty('password');

      // Check cookies are set
      AssertionHelper.assertCookie(response, 'refreshToken');
      AssertionHelper.assertCookie(response, 'XSRF-TOKEN');

      // Verify user in database
      const userRepo = appHelper.getDataSource().getRepository('User');
      const savedUser = await userRepo.findOne({
        where: { email: validUserData.email },
      });
      expect(savedUser).toBeDefined();
      AssertionHelper.assertUUID(savedUser?.id);
    });

    it('should return requiresVerification flag', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('requiresVerification');
      expect(typeof response.body.requiresVerification).toBe('boolean');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await appHelper
        .request()
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send(validUserData);

      AssertionHelper.assertErrorResponse(response, 409, 'already exists');
    });

    it('should validate email format', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email',
        });

      AssertionHelper.assertErrorResponse(response, 400);
      expect(response.body.message[0]).toContain('email');
    });

    it('should validate password strength', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send({
          ...validUserData,
          password: 'weak',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should require firstName', async () => {
      const response = await appHelper.request().post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test123!@#',
        lastName: 'Doe',
      });

      AssertionHelper.assertErrorResponse(response, 400, 'firstName');
    });

    it('should require lastName', async () => {
      const response = await appHelper.request().post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
      });

      AssertionHelper.assertErrorResponse(response, 400, 'lastName');
    });

    it('should trim whitespace from email', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send({
          ...validUserData,
          email: '  test@example.com  ',
        })
        .expect(201);

      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should not allow empty password', async () => {
      const response = await appHelper
        .request()
        .post('/auth/register')
        .send({
          ...validUserData,
          password: '',
        });

      AssertionHelper.assertErrorResponse(response, 400);
    });

    it('should create refresh token in database', async () => {
      await appHelper
        .request()
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      const refreshTokenRepo = appHelper
        .getDataSource()
        .getRepository('RefreshToken');
      const tokens = await refreshTokenRepo.find();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
