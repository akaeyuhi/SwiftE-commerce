import { DataSourceOptions } from 'typeorm';

export const DatabaseConnectionConfiguration: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'admin',
  database: 'ecommerce_db',
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: true,
};
