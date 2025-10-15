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

    const registerResponse = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send(defaultUser)
      .timeout(10000)
      .expect(201);

    const user = registerResponse.body.user;

    if (registerResponse.body.requiresVerification) {
      const confirmationRepo = this.dataSource.getRepository('Confirmation');
      const confirmation = await confirmationRepo
        .createQueryBuilder('confirmation')
        .addSelect('confirmation.plainToken')
        .where('confirmation.userId = :userId', { userId: user.id })
        .andWhere('confirmation.type = :type', { type: 'account_verification' })
        .getOne();

      if (!confirmation) {
        throw new Error('Confirmation token not found');
      }

      await request(this.app.getHttpServer())
        .post('/auth/confirm/account-verification')
        .send({ token: confirmation.plainToken })
        .timeout(10000)
        .expect(201);
    }

    const loginResponse = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: defaultUser.email,
        password: defaultUser.password,
      })
      .timeout(10000)
      .expect(201);

    return {
      user: loginResponse.body.user,
      accessToken: loginResponse.body.accessToken,
      refreshToken: loginResponse.body.refreshToken,
    };
  }

  async createAdminUser(): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const auth = await this.createAuthenticatedUser({
      email: `admin_${Date.now()}@example.com`,
    });

    const userRepo = this.dataSource.getRepository(User);

    const adminRepo = this.dataSource.getRepository('Admin');
    await adminRepo.save({
      userId: auth.user.id,
      isActive: true,
      assignedAt: new Date(),
    });

    const updatedUser = await userRepo.findOne({
      where: { id: auth.user.id },
    });

    await userRepo.update(auth.user.id, { siteRole: AdminRoles.ADMIN });

    return {
      ...auth,
      user: updatedUser || auth.user,
    };
  }

  authenticatedRequest(accessToken: string) {
    const server = this.app.getHttpServer();

    return {
      get: (url: string) =>
        this.autoLog(
          request(server)
            .get(url)
            .set('Authorization', `Bearer ${accessToken}`),
          'GET',
          url
        ),

      post: (url: string) =>
        this.autoLog(
          request(server)
            .post(url)
            .set('Authorization', `Bearer ${accessToken}`),
          'POST',
          url
        ),

      put: (url: string) =>
        this.autoLog(
          request(server)
            .put(url)
            .set('Authorization', `Bearer ${accessToken}`),
          'PUT',
          url
        ),

      delete: (url: string) =>
        this.autoLog(
          request(server)
            .delete(url)
            .set('Authorization', `Bearer ${accessToken}`),
          'DELETE',
          url
        ),

      patch: (url: string) =>
        this.autoLog(
          request(server)
            .patch(url)
            .set('Authorization', `Bearer ${accessToken}`),
          'PATCH',
          url
        ),
    };
  }

  /**
   * Get caller location from stack trace
   */
  private getCallerLocation(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.e2e-spec.ts') && !line.includes('auth.helper')) {
        const match = line.match(/\((.+\.e2e-spec\.ts):(\d+):(\d+)\)/);
        if (match) {
          const file = match[1].split('/').pop() || match[1].split('\\').pop();
          const lineNum = match[2];
          return `${file}:${lineNum}`;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Log without Jest stack traces
   */
  private log(message: string, isError = false) {
    const output = isError ? process.stderr : process.stdout;
    output.write(message + '\n');
  }

  /**
   * Automatically log response after request completes
   */
  private autoLog(
    req: request.Test,
    method: string,
    url: string
  ): request.Test {
    let requestBody: any;
    const callerLocation = this.getCallerLocation();

    // Capture request body
    const originalSend = req.send.bind(req);
    req.send = (data: any) => {
      requestBody = data;
      return originalSend(data);
    };

    // Wrap end() which is called when request completes
    const originalEnd = req.end.bind(req);
    req.end = (callback?: any) =>
      originalEnd((err: any, res: any) => {
        // Log after response is received
        if (err || res.status >= 400) {
          // Error or 4xx/5xx response - use stderr
          this.log(`\n❌ ${method} ${url}`, true);
          this.log(`📍 ${callerLocation}`, true);
          if (requestBody) {
            this.log(`Request: ${JSON.stringify(requestBody, null, 2)}`, true);
          }
          this.log(`Status: ${res?.status || 'No response'}`, true);
          if (res?.body) {
            this.log(`Response: ${JSON.stringify(res.body, null, 2)}`, true);
          } else if (res?.text) {
            this.log(`Response: ${res.text}`, true);
          }
        } else {
          // Success response - use stdout
          this.log(`\n✅ ${method} ${url}`);
          this.log(`📍 ${callerLocation}`);
          if (requestBody) {
            this.log(`Request: ${JSON.stringify(requestBody, null, 2)}`);
          }
          this.log(`Status: ${res.status}`);
          this.log(`Response: ${JSON.stringify(res.body, null, 2)}`);
        }

        // Call original callback
        if (callback) {
          callback(err, res);
        }
      });

    return req;
  }
}
