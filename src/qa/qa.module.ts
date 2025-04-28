// qa/qa.module.ts
import { Module } from '@nestjs/common';
import { QAService } from './qa.service';

@Module({
  providers: [QAService],
  exports: [QAService],
})
export class QAModule {}