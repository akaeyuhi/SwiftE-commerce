import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnectionConfiguration } from 'database/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(DatabaseConnectionConfiguration),
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
