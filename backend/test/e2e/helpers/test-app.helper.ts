import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthorizationModule } from 'src/modules/authorization/authorization.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';
import { QueuesModule } from 'src/modules/infrastructure/queues/queues.module';
import { InterceptorsModule } from 'src/modules/infrastructure/interceptors/interceptors.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SubscribersModule } from 'src/database/subscribers/subscribers.module';
import { TestDatabaseConfiguration } from '../config/test-ormconfig';
import { AnalyticsReviewsModule } from 'src/modules/analytics-reviews/analytics-reviews.module';
import { UserModule } from 'src/modules/user/user.module';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';

export class TestAppHelper {
  private module: TestingModule;
  private application: INestApplication;
  private dataSource: DataSource;

  async initialize(config: { imports: any[] }): Promise<INestApplication> {
    // Filter out invalid imports
    const validImports = config.imports.filter((module) => {
      if (!module) {
        console.warn('Skipping null/undefined import');
        return false;
      }
      if (typeof module !== 'function' && !module.module) {
        console.warn('Skipping invalid module:', module);
        return false;
      }
      return true;
    });

    const moduleBuilder = Test.createTestingModule({
      imports: [
        await ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(TestDatabaseConfiguration),
        SubscribersModule,
        AuthorizationModule,
        AnalyticsReviewsModule,
        UserModule,
        AuthModule,
        NotificationsModule,
        InterceptorsModule,
        QueuesModule,
        ...validImports,
      ],
    });

    // // Mock all queue providers
    // const queueNames = [
    //   'email',
    //   'notifications',
    //   'analytics',
    //   'processing',
    //   // Add all your queue names here
    // ];
    //
    // // Create mock queue for each queue name
    // queueNames.forEach((queueName) => {
    //   moduleBuilder.overrideProvider(getQueueToken(queueName)).useValue({
    //     add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    //     process: jest.fn(),
    //     on: jest.fn(),
    //     close: jest.fn().mockResolvedValue(undefined),
    //     removeJobs: jest.fn().mockResolvedValue(undefined),
    //     clean: jest.fn().mockResolvedValue(undefined),
    //     getJob: jest.fn(),
    //     getJobs: jest.fn().mockResolvedValue([]),
    //     getJobCounts: jest.fn().mockResolvedValue({}),
    //   });
    // });
    //
    // // Mock email service if it exists
    // moduleBuilder.overrideProvider('EmailService').useValue({
    //   sendEmail: jest.fn().mockResolvedValue(true),
    //   sendVerificationEmail: jest.fn().mockResolvedValue(true),
    //   sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    // });
    //
    // // Mock notification service if it exists
    // moduleBuilder.overrideProvider('NotificationService').useValue({
    //   send: jest.fn().mockResolvedValue(true),
    //   sendPush: jest.fn().mockResolvedValue(true),
    // });

    this.module = await moduleBuilder.compile();

    this.application = this.module.createNestApplication();

    this.application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    this.dataSource = this.module.get<DataSource>(DataSource);

    this.application.use(cookieParser());

    await this.application.init();

    return this.application;
  }

  getHttpServer() {
    return this.application.getHttpServer();
  }

  async clearTable(tableName: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(tableName)
      .execute();
  }

  async clearCategories(): Promise<void> {
    // Clear join table first
    await this.clearTable('product_categories');
    // Then categories
    await this.clearTable('categories');
  }

  request() {
    const server = this.application.getHttpServer();

    return {
      get: (url: string) => this.autoLog(request(server).get(url), 'GET', url),
      post: (url: string) =>
        this.autoLog(request(server).post(url), 'POST', url),
      put: (url: string) => this.autoLog(request(server).put(url), 'PUT', url),
      delete: (url: string) =>
        this.autoLog(request(server).delete(url), 'DELETE', url),
      patch: (url: string) =>
        this.autoLog(request(server).patch(url), 'PATCH', url),
    };
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Clear all data from all tables
   * Use this in afterEach or beforeEach to reset database state
   */
  async clearDatabase(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    try {
      const entities = this.dataSource.entityMetadatas;

      // Disable foreign key checks temporarily
      await this.dataSource.query('SET session_replication_role = replica;');

      // Truncate all tables
      for (const entity of entities) {
        await this.dataSource.query(
          `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`
        );
      }

      // Re-enable foreign key checks
      await this.dataSource.query('SET session_replication_role = DEFAULT;');
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      throw error;
    }
  }

  /**
   * Clear specific tables only
   * Useful when you only need to clean certain tables
   *
   * @param tableNames Array of table names to clear
   * @example await appHelper.clearTables(['categories', 'products']);
   */
  async clearTables(tableNames: string[]): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    try {
      // Disable foreign key checks temporarily
      await this.dataSource.query('SET session_replication_role = replica;');

      for (const tableName of tableNames) {
        try {
          await this.dataSource.query(
            `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`
          );
        } catch (error) {
          // Ignore if table doesn't exist
          if (!error.message.includes('does not exist')) {
            throw error;
          }
        }
      }

      // Re-enable foreign key checks
      await this.dataSource.query('SET session_replication_role = DEFAULT;');
    } catch (error) {
      console.error('❌ Error clearing tables:', error.message);
      throw error;
    }
  }

  /**
   * Clear all data except specific tables
   * Useful when you want to preserve some reference data
   *
   * @param excludeTables Array of table names to exclude from clearing
   * @example await appHelper.clearDatabaseExcept(['users', 'stores']);
   */
  async clearDatabaseExcept(excludeTables: string[]): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    try {
      const entities = this.dataSource.entityMetadatas;

      // Filter tables to clear
      const tablesToClear = entities
        .map((entity) => entity.tableName)
        .filter((tableName) => !excludeTables.includes(tableName));

      await this.clearTables(tablesToClear);
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      throw error;
    }
  }

  /**
   * Delete all records from a specific entity
   * Alternative to TRUNCATE that respects soft deletes
   *
   * @param entityName Name of the entity to clear
   * @example await appHelper.deleteAll('Product');
   */
  async deleteAll(entityName: string): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    try {
      const repository = this.dataSource.getRepository(entityName);
      await repository.delete({});
    } catch (error) {
      console.error(
        `❌ Error deleting records from ${entityName}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get count of records in a table
   * Useful for verifying cleanup
   *
   * @param entityName Name of the entity
   * @returns Number of records
   */
  async getRecordCount(entityName: string): Promise<number> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    const repository = this.dataSource.getRepository(entityName);
    return await repository.count();
  }

  /**
   * Cleanup and close connections
   * Use this in afterAll
   */
  async cleanup(): Promise<void> {
    try {
      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
      }

      if (this.application) {
        await this.application.close();
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);

      // Force close even if cleanup fails
      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
      }
      if (this.application) {
        await this.application.close();
      }
    }
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
