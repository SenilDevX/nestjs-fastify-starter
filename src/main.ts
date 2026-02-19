import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  // middlewares
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Set up api docs
  const config = new DocumentBuilder()
    .setTitle('GPMS Todo API')
    .setDescription('Learning sandbox for GPMS backend patterns')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.use(
    '/docs',
    apiReference({
      content: document,
      withFastify: true,
    }),
  );

  const port = app.get(ConfigService).get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
