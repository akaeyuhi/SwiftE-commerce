import { NestFactory } from '@nestjs/core';
import { SeedModule } from 'src/modules/infrastructure/seeders/seed.module';
import { SeedService } from 'src/modules/infrastructure/seeders/seed.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SeedModule);

  const seeder = appContext.get(SeedService);
  try {
    await seeder.seed();
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed!');
    console.error(error);
  } finally {
    await appContext.close();
  }
}

bootstrap();
