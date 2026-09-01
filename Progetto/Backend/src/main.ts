import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(cookieParser());
  const allowedOrigins: (string | RegExp)[] = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
  ];

  if (process.env.FRONTEND_BASE_URL) {
    try {
      const url = new URL(process.env.FRONTEND_BASE_URL);
      allowedOrigins.push(url.origin);
    } catch {
      allowedOrigins.push(process.env.FRONTEND_BASE_URL);
    }
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
