// telegram/telegram.module.ts
import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { AIModule } from '../ai/ai.module';
import { QAModule } from '../qa/qa.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    AIModule,
    QAModule,
    PrismaModule, // Add PrismaModule
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}