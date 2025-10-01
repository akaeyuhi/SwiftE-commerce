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
import { EmailModule } from './modules/email/email.module';
import { QueuesModule } from './modules/infrastructure/queues/queues.module';
import { InterceptorsModule } from './modules/infrastructure/interceptors/interceptors.module';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AdminModule } from 'src/modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    AuthorizationModule,
    UserModule,
    AdminModule,
    AuthModule,
    StoreModule,
    ProductsModule,
    AnalyticsModule,
    AiModule,
    EmailModule,
    QueuesModule,
    InterceptorsModule,
    InfrastructureModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
