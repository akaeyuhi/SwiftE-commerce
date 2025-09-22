import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProductPhotoModule } from 'src/modules/store/modules/products/modules/product-photo/product-photo.module';
import { AdminModule } from 'src/modules/auth/modules/admin/admin.module';
import { OrderItemModule } from 'src/modules/store/modules/orders/modules/order-item/order-item.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiGeneratorModule } from './modules/ai-generator/ai-generator.module';
import { AiAuditsModule } from './modules/ai-audit/ai-audit.module';
import { AiPredictorModule } from './modules/ai-predictor/ai-predictor.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ProductPhotoModule,
    AdminModule,
    OrderItemModule,
    AnalyticsModule,
    AiGeneratorModule,
    AiAuditsModule,
    AiPredictorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
