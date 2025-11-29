import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors();

  await app.listen(3002, '0.0.0.0');
  console.log(`API server listening on http://localhost:3002`);
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
