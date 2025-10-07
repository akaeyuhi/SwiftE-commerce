import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export class TestAppHelper {
  private app: INestApplication;
  private module: TestingModule;
  private dataSource: DataSource;

  async initialize(moduleToImport: any): Promise<INestApplication> {
    this.module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get('DB_HOST', 'localhost'),
            port: config.get('DB_PORT', 5432),
            username: config.get('DB_USERNAME', 'test'),
            password: config.get('DB_PASSWORD', 'test'),
            database: config.get('DB_NAME', 'test_db'),
            entities: ['src/**/*.entity{.ts,.js}'],
            synchronize: true, // Only for testing
            dropSchema: true, // Clean DB before each test
            logging: false,
          }),
        }),
        moduleToImport,
      ],
    }).compile();

    this.app = this.module.createNestApplication();

    // Apply global pipes and filters
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await this.app.init();

    this.dataSource = this.module.get(DataSource);

    return this.app;
  }

  getApp(): INestApplication {
    return this.app;
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  async cleanup(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * Clear all data from database
   */
  async clearDatabase(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Get repository for testing
   */
  getRepository<T>(entity: new () => T) {
    return this.dataSource.getRepository(entity);
  }
}
