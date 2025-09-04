import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProductPhotoModule } from './modules/product-photo/product-photo.module';

@Module({
  imports: [ConfigModule.forRoot(), ProductPhotoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
