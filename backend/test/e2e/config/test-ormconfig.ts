import { DataSourceOptions } from 'typeorm';

export const TestDatabaseConfiguration: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'test_user',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_DATABASE || 'ecommerce_test_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: true,
  dropSchema: true,
  logging: false,
};
