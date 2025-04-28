// qa/qa.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

interface QA {
    question: string;
    answer: string;
}

@Injectable()
export class QAService implements OnModuleInit {
    private qaMap = new Map<string, string>();

    async onModuleInit() {
        try {
            const qaData = await fs.readFile(path.resolve('./data/qa.json'), 'utf-8');
            const qaJson: QA[] = JSON.parse(qaData);

            qaJson.forEach(qa => {
                this.qaMap.set(qa.question, qa.answer);
            });

            console.log('QA data loaded successfully');
        } catch (err) {
            console.error('Failed to load qa.json:', err);
            process.exit(1);
        }
    }

    getAnswer(question: string): string | undefined {
        return this.qaMap.get(question);
    }
}