import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnectionConfiguration } from 'src/config/ormconfig';

@Module({
  imports: [TypeOrmModule.forRoot(DatabaseConnectionConfiguration)],
})
export class DatabaseModule {}
