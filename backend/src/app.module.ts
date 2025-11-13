import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AiModule } from './modules/ai/ai.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AdminModule } from 'src/modules/admin/admin.module';
import { QueuesModule } from 'src/modules/infrastructure/queues/queues.module';
import { InterceptorsModule } from 'src/modules/infrastructure/interceptors/interceptors.module';
import { AnalyticsReviewsModule } from './modules/analytics-reviews/analytics-reviews.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';
import { CleanupModule } from 'src/modules/infrastructure/cleanup/cleanup.module';
import { RabbitMQModule } from 'src/modules/infrastructure/rabbitmq/rabbitmq.module';
import { SeedModule } from 'src/database/seeders/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    SeedModule,
    AuthorizationModule,
    QueuesModule,
    InterceptorsModule,
    UserModule,
    AdminModule,
    AuthModule,
    StoreModule,
    ProductsModule,
    AnalyticsModule,
    AiModule,
    AnalyticsReviewsModule,
    NotificationsModule,
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
