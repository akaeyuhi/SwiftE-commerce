import { DataSourceOptions } from 'typeorm';
import { ProductStatsSubscriber } from 'src/entities/subscribers/product-stats.subscriber';
import { LikeCountSubscriber } from 'src/entities/subscribers/like-count.subscriber';
import { StoreProductCountSubscriber } from 'src/entities/subscribers/store-product-count.subscriber';
import { StoreRevenueSubscriber } from 'src/entities/subscribers/store-revenue.subscriber';

export const DatabaseConnectionConfiguration: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT!) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ecommerce_db',
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: true,
  subscribers: [
    ProductStatsSubscriber,
    LikeCountSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
  ],
};
