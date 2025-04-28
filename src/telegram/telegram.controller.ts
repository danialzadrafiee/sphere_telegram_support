// telegram/telegram.controller.ts
import { Controller, Post, Req, Res, All } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { IncomingMessage, ServerResponse } from 'http';
import { Update } from 'telegraf/typings/core/types/typegram';

@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) { }

    @Post()
    async handleWebhook(
        @Req() req: IncomingMessage & { body?: Update | undefined },
        @Res() res: ServerResponse<IncomingMessage>
    ): Promise<void> {
        const webhookHandler = this.telegramService.getWebhookCallback();
        return webhookHandler(req, res);
    }

    @All()
    healthCheck(@Res() res: ServerResponse<IncomingMessage>): void {
        res.end('Bot server is running.');
    }
}