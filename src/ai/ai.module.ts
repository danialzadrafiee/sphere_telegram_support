// ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { QAModule } from 'src/qa/qa.module';

@Module({
  imports: [QAModule],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
