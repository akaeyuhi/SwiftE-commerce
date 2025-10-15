import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnectionConfiguration } from 'src/config/ormconfig';
import { SubscribersModule } from 'src/database/subscribers/subscribers.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(DatabaseConnectionConfiguration),
    SubscribersModule,
  ],
  exports: [SubscribersModule],
})
export class DatabaseModule {}
