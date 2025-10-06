import { DataSourceOptions } from 'typeorm';
import { ProductStatsSubscriber } from 'src/database/subscribers/product-stats.subscriber';
import { LikeCountSubscriber } from 'src/database/subscribers/like-count.subscriber';
import { StoreProductCountSubscriber } from 'src/database/subscribers/store-product-count.subscriber';
import { StoreRevenueSubscriber } from 'src/database/subscribers/store-revenue.subscriber';
import { AnalyticsSyncSubscriber } from 'src/database/subscribers/analytics-sync.subscriber';

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
    AnalyticsSyncSubscriber,
  ],
};
