import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { User } from 'src/entities/user/user.entity';
import { DataSource } from 'typeorm';
import { AdminRoles } from 'src/common/enums/admin.enum';

export class AuthHelper {
  constructor(
    private app: INestApplication,
    private dataSource: DataSource
  ) {}

  /**
   * Create a test user and return auth tokens
   */
  async createAuthenticatedUser(userData?: Partial<User>): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const defaultUser = {
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'Test123!@#',
      ...userData,
    };

    // Register user
    const registerResponse = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send(defaultUser)
      .expect(201);

    const user = registerResponse.body.user;

    // Confirm email (if needed)
    if (registerResponse.body.requiresConfirmation) {
      // Get confirmation token from database
      const confirmationRepo = this.dataSource.getRepository('Confirmation');
      const confirmation = await confirmationRepo.findOne({
        where: { user: { id: user.id } },
      });

      await request(this.app.getHttpServer())
        .post('/auth/confirm')
        .send({ token: confirmation?.token })
        .expect(200);
    }

    // Login to get tokens
    const loginResponse = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: defaultUser.email,
        password: defaultUser.password,
      })
      .expect(200);

    return {
      user: loginResponse.body.user,
      accessToken: loginResponse.body.accessToken,
      refreshToken: loginResponse.body.refreshToken,
    };
  }

  /**
   * Create an admin user
   */
  async createAdminUser(): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const auth = await this.createAuthenticatedUser({
      email: `admin_${Date.now()}@example.com`,
    });

    // Promote to admin
    const userRepo = this.dataSource.getRepository(User);
    await userRepo.update(auth.user.id, { siteRole: AdminRoles.ADMIN });

    return auth;
  }

  /**
   * Get authenticated request agent
   */
  authenticatedRequest(accessToken: string) {
    return request(this.app.getHttpServer()).set(
      'Authorization',
      `Bearer ${accessToken}`
    );
  }
}
