import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { requireJwtSecret } from './common/jwt-secret';

function corsOrigins(): string[] | false {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return false;
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

async function bootstrap(): Promise<void> {
  // Fail-hard: refuse to boot without a real JWT signing key.
  requireJwtSecret();

  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 8080;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
