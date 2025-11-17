import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
//import { SeedService } from 'src/modules/infrastructure/seeders/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:5173', // ✅ Specific origin, not '*'
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          errors: Object.values(error.constraints || {}),
          value: error.value,
          children: error.children,
        }));

        console.log('=== Validation Errors ===');
        console.log(JSON.stringify(messages, null, 2));

        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter()); // Register the global exception filter
  app.setGlobalPrefix('/api');
  //const seeder = app.get(SeedService);
  //await seeder.seed();
  const config = new DocumentBuilder()
    .setTitle('ESwift API')
    .setDescription('The ESwift API 1.0 basic example and description')
    .setVersion('1.0')
    .addTag('e-commerce')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
