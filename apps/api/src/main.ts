import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 8080;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
