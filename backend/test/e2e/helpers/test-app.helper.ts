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
import { getQueueToken } from '@nestjs/bull';
import * as request from 'supertest';

export function listRegisteredRoutes(app: INestApplication) {
  const server = app.getHttpServer();
  if (!server) return [];

  // Express adapter common shapes: try common locations
  const router =
    server._events?.request?.router ?? // some envs
    server._router ?? // direct attach
    server?.stack ?? // Express sometimes exposes stack on server
    server; // fallback

  const stack = (router && router.stack) || [];

  const routes: Array<{ method: string; path: string }> = [];

  const inspectLayer = (layer: any, prefix = '') => {
    if (!layer) return;
    // direct route
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {});
      for (const m of methods) {
        routes.push({
          method: m.toUpperCase(),
          path: prefix + layer.route.path,
        });
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // nested router
      (layer.handle.stack || []).forEach((l: any) => inspectLayer(l, prefix));
    } else if (layer.name === 'bound dispatch' && layer.regexp) {
      // express 4.x route object - best-effort
      const path =
        layer.regexp && layer.regexp.fast_star ? '*' : layer.regexp?.toString();
      routes.push({ method: '(unknown)', path: path ?? '<unknown>' });
    } else if (layer.handle && layer.handle.stack) {
      (layer.handle.stack || []).forEach((l: any) => inspectLayer(l, prefix));
    }
  };

  for (const layer of stack) {
    inspectLayer(layer, '');
  }

  // dedupe & format
  const uniq = new Map<string, { method: string; path: string }>();
  for (const r of routes) uniq.set(`${r.method} ${r.path}`, r);
  return Array.from(uniq.values());
}

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

    // Mock all queue providers
    const queueNames = [
      'email',
      'notifications',
      'analytics',
      'processing',
      // Add all your queue names here
    ];

    // Create mock queue for each queue name
    queueNames.forEach((queueName) => {
      moduleBuilder.overrideProvider(getQueueToken(queueName)).useValue({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        process: jest.fn(),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        removeJobs: jest.fn().mockResolvedValue(undefined),
        clean: jest.fn().mockResolvedValue(undefined),
        getJob: jest.fn(),
        getJobs: jest.fn().mockResolvedValue([]),
        getJobCounts: jest.fn().mockResolvedValue({}),
      });
    });

    // Mock email service if it exists
    moduleBuilder.overrideProvider('EmailService').useValue({
      sendEmail: jest.fn().mockResolvedValue(true),
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    });

    // Mock notification service if it exists
    moduleBuilder.overrideProvider('NotificationService').useValue({
      send: jest.fn().mockResolvedValue(true),
      sendPush: jest.fn().mockResolvedValue(true),
    });

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
      get: (url: string) => request(server).get(url),
      post: (url: string) => request(server).post(url),
      put: (url: string) => request(server).put(url),
      delete: (url: string) => request(server).delete(url),
      patch: (url: string) => request(server).patch(url),
    };
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  logRoutes(): void {
    const routes = listRegisteredRoutes(this.application);
    console.log('--- Registered routes (express best-effort) ---');
    routes.forEach((r) => console.log(r.method.padEnd(8), r.path));
    console.log('-----------------------------------------------');
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
}
