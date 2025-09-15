import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProductPhotoModule } from 'src/modules/products/product-photo/product-photo.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [ConfigModule.forRoot(), ProductPhotoModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
