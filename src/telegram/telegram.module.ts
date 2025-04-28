// telegram/telegram.module.ts
import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { AIModule } from '../ai/ai.module';
import { QAModule } from '../qa/qa.module'; // Import QAModule

@Module({
  imports: [
    AIModule,
    QAModule, 
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}