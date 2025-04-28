// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);
  console.log(`🚀 Server listening on port ${PORT}`);
}
bootstrap();