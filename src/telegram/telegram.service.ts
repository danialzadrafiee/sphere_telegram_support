// telegram/telegram.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { AIService } from 'src/ai/ai.service';
import { QAService } from 'src/qa/qa.service';
import { IncomingMessage, ServerResponse } from 'http';
import { Update } from 'telegraf/typings/core/types/typegram';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: Telegraf;
    private processingUsers = new Set<number>();
    private DAILY_MESSAGE_LIMIT = 200; 
    // Keyboards
    private mainMenuKeyboard = Markup.keyboard([
        ['💰 تعرفه پاس کردن چالش‌ها', '⚠️ قوانین و محدودیت‌ها'],
        ['💸 نحوه برداشت سود', '🤖 سوالات درباره ربات'],
        ['🔐 امنیت حساب', '📱 ترید با موبایل']
    ]).resize();

    private feeQuestionsKeyboard = Markup.keyboard([
        ['تعرفه حساب‌های مختلف', 'زمان پاس شدن چالش'],
        ['تضمین پاس کردن چالش', 'هزینه پاس کردن چالش'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private rulesQuestionsKeyboard = Markup.keyboard([
        ['دراپ داون چیست؟', 'مارتینگل چیست؟'],
        ['هج چیست؟', 'حداقل روزهای معاملاتی'],
        ['ترید با اخبار', 'اهرم ترید'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private profitQuestionsKeyboard = Markup.keyboard([
        ['روش برداشت سود', 'زمان برداشت'],
        ['حداقل سود برای برداشت', 'تقسیم سود در حساب ریل'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private botQuestionsKeyboard = Markup.keyboard([
        ['چطور ربات کار میکنه؟', 'نحوه ارسال اطلاعات حساب'],
        ['نمادهای معاملاتی ربات', 'امکان ترید همزمان با ربات'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private securityQuestionsKeyboard = Markup.keyboard([
        ['مشکل IP', 'امنیت اطلاعات ورود'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private mobileQuestionsKeyboard = Markup.keyboard([
        ['آیا میتوان با موبایل ترید کرد؟'],
        ['🔙 بازگشت به منوی اصلی']
    ]).resize();

    private predefinedQuestions = [
        'تعرفه حساب‌های مختلف', 'زمان پاس شدن چالش', 'تضمین پاس کردن چالش', 'هزینه پاس کردن چالش',
        'دراپ داون چیست؟', 'مارتینگل چیست؟', 'هج چیست؟', 'حداقل روزهای معاملاتی', 'ترید با اخبار', 'اهرم ترید',
        'روش برداشت سود', 'زمان برداشت', 'حداقل سود برای برداشت', 'تقسیم سود در حساب ریل',
        'چطور ربات کار میکنه؟', 'نحوه ارسال اطلاعات حساب', 'نمادهای معاملاتی ربات', 'امکان ترید همزمان با ربات',
        'مشکل IP', 'امنیت اطلاعات ورود', 'آیا میتوان با موبایل ترید کرد؟'
    ];

    constructor(
        private configService: ConfigService,
        private aiService: AIService,
        private qaService: QAService,
        private prisma: PrismaService, 
    ) {
        this.bot = new Telegraf(this.configService.get<string>('TELEGRAM_TOKEN') || '');
    }

    async onModuleInit() {
        this.setupBot();

        const MODE = this.configService.get<string>('MODE', 'production');

        if (MODE === 'dev') {
            await this.bot.launch();
            console.log('🚀 Bot is running in polling mode (development)');
        } else {
            const webhookPath = '/telegram';
            const WEBHOOK_HOST = this.configService.get<string>('WEBHOOK_HOST');

            if (!WEBHOOK_HOST) {
                console.error("FATAL: WEBHOOK_HOST environment variable is not set for production mode.");
                process.exit(1);
            }

            const webhookUrl = `https://${WEBHOOK_HOST}${webhookPath}`;
            await this.bot.telegram.setWebhook(webhookUrl);
            console.log(`🚀 Webhook set to ${webhookUrl}`);
        }
    }

    getWebhookCallback(): (
        req: IncomingMessage & { body?: Update | undefined },
        res: ServerResponse<IncomingMessage>,
        next?: (() => void) | undefined
    ) => Promise<void> {
        return this.bot.webhookCallback('/telegram');
    }

    private setupBot() {
        this.bot.start(async (ctx) => {
            const userId = ctx.from.id;
            const userName = ctx.from.first_name || 'کاربر';

            // Register or update user in database
            await this.getOrCreateUser(ctx);

            const welcomeMessage =
                `🌟 سلام ${userName} عزیز، خوش آمدید! 🌟\n\n` +
                `به ربات پشتیبان خدمات پاس پراپ خوش آمدید.\n\n` +
                `✅ ما با ربات هوش مصنوعی پیشرفته، حساب پراپ شما را در کمتر از یک هفته پاس می‌کنیم.\n\n` +
                `💡 چه سوالی دارید؟ می‌توانید از دکمه‌های زیر استفاده کنید یا سوال خود را بنویسید.`;

            await ctx.reply(welcomeMessage, this.mainMenuKeyboard);
        });


        // Back button handler
        this.bot.hears('🔙 بازگشت به منوی اصلی', (ctx) => {
            const userId = ctx.from.id;

            if (this.processingUsers.has(userId)) {
                this.processingUsers.delete(userId);
            }

            ctx.reply('به منوی اصلی بازگشتید. لطفاً انتخاب کنید:', this.mainMenuKeyboard);
            return;
        });

        // Main menu handlers
        this.bot.hears('💰 تعرفه پاس کردن چالش‌ها', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.feeQuestionsKeyboard);
        });

        this.bot.hears('⚠️ قوانین و محدودیت‌ها', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.rulesQuestionsKeyboard);
        });

        this.bot.hears('💸 نحوه برداشت سود', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.profitQuestionsKeyboard);
        });

        this.bot.hears('🤖 سوالات درباره ربات', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.botQuestionsKeyboard);
        });

        this.bot.hears('🔐 امنیت حساب', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.securityQuestionsKeyboard);
        });

        this.bot.hears('📱 ترید با موبایل', (ctx) => {
            const userId = ctx.from.id;
            if (this.processingUsers.has(userId)) return;
            ctx.reply('لطفاً انتخاب کنید:', this.mobileQuestionsKeyboard);
        });

        // Predefined question handlers
        this.predefinedQuestions.forEach(question => {
            this.bot.hears(question, async (ctx) => {
                const userId = ctx.from.id;
                if (this.processingUsers.has(userId)) return;
                if (!await this.checkMessageLimit(ctx)) return;
                const answered = await this.sendHardcodedAnswer(ctx, question);
                if (!answered) {
                    await this.processQuestionWithAI(ctx, question);
                }
                await this.logMessage(ctx, question, answered ? this.qaService.getAnswer(question) || "" : "AI Response");
            });
        });

        this.bot.on('text', async (ctx) => {
            const userId = ctx.from.id;
            const query = ctx.message.text;

            // Skip if already processing or if it's a handled button
            if (this.processingUsers.has(userId) ||
                this.predefinedQuestions.includes(query) ||
                query.includes('بازگشت به منوی اصلی') ||
                query.includes('تعرفه پاس کردن چالش‌ها') ||
                query.includes('قوانین و محدودیت‌ها') ||
                query.includes('نحوه برداشت سود') ||
                query.includes('سوالات درباره ربات') ||
                query.includes('امنیت حساب') ||
                query.includes('ترید با موبایل')) {
                return;
            }

            // Check message limit first
            if (!await this.checkMessageLimit(ctx)) return;

            await this.processQuestionWithAI(ctx, query);
        });
    }

    private async getOrCreateUser(ctx: Context) {
        if (!ctx.from) return null;

        const telegramId = BigInt(ctx.from.id);
        try {
            // Find user or create if doesn't exist
            const user = await this.prisma.user.upsert({
                where: { telegramId },
                update: {
                    firstName: ctx.from.first_name || null,
                    lastName: ctx.from.last_name || null,
                    username: ctx.from.username || null,
                },
                create: {
                    telegramId,
                    firstName: ctx.from.first_name || null,
                    lastName: ctx.from.last_name || null,
                    username: ctx.from.username || null,
                    messageCount: 0,
                    dailyCount: 0,
                    lastResetDate: new Date(),
                }
            });
            return user;
        } catch (error) {
            console.error('Error getting/creating user:', error);
            return null;
        }
    }

    private async checkMessageLimit(ctx: Context): Promise<boolean> {
        if (!ctx.from) return false;

        const user = await this.getOrCreateUser(ctx);
        if (!user) return false;

        // Reset counter if it's a new day
        const now = new Date();
        const lastReset = user.lastResetDate || new Date(0);

        if (now.getDate() !== lastReset.getDate() ||
            now.getMonth() !== lastReset.getMonth() ||
            now.getFullYear() !== lastReset.getFullYear()) {

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    dailyCount: 0,
                    lastResetDate: now
                }
            });

            // Fetch updated user
            const updatedUser = await this.prisma.user.findUnique({
                where: { id: user.id }
            });

            if (!updatedUser) return false;

            if (updatedUser.dailyCount >= this.DAILY_MESSAGE_LIMIT) {
                await ctx.reply('⚠️ شما به محدودیت پیام روزانه رسیده‌اید. لطفاً فردا دوباره تلاش کنید.');
                return false;
            }
        } else if (user.dailyCount >= this.DAILY_MESSAGE_LIMIT) {
            await ctx.reply('⚠️ شما به محدودیت پیام روزانه رسیده‌اید. لطفاً فردا دوباره تلاش کنید.');
            return false;
        }

        return true;
    }
    private async logMessage(ctx: Context, content: string, response: string) {
        if (!ctx.from) return;

        const user = await this.getOrCreateUser(ctx);
        if (!user) return;

        try {
            // Update user's message count and last message time
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    messageCount: { increment: 1 },
                    dailyCount: { increment: 1 },
                    lastMessageDate: new Date()
                }
            });

            // Create message record
            await this.prisma.message.create({
                data: {
                    userId: user.id,
                    content,
                    response
                }
            });
        } catch (error) {
            console.error('Error logging message:', error);
        }
    }

    private async sendHardcodedAnswer(ctx: Context, question: string): Promise<boolean> {
        const answer = this.qaService.getAnswer(question);
        if (answer) {
            await ctx.reply(answer, this.mainMenuKeyboard);
            return true;
        }
        return false;
    }


    private async processQuestionWithAI(ctx: Context, question: string) {
        const userId = ctx?.from?.id;
        if (userId) {
            this.processingUsers.add(userId);
            let answer = "";

            try {
                const processingMsg = await ctx.reply("در حال پردازش سوال شما...");
                answer = await this.aiService.getAnswer(question);

                try {
                    await ctx.deleteMessage(processingMsg.message_id);
                } catch (deleteErr) {
                    console.log("Could not delete processing message:", deleteErr.message);
                }

                if (!answer || answer.trim().length === 0 || answer.includes("متاسفانه دراین رابطه اطلاعی ندارم")) {
                    answer = "❌ متاسفانه اطلاعات کافی برای پاسخ به این سوال ندارم.";
                    await ctx.reply(answer, this.mainMenuKeyboard);
                } else {
                    await ctx.reply(answer, this.mainMenuKeyboard);
                }

                // Log the message
                await this.logMessage(ctx, question, answer);

            } catch (err) {
                console.error("Error processing question:", err);
                answer = "❌ مشکلی در پردازش سوال شما پیش آمد. لطفاً لحظاتی دیگر دوباره تلاش کنید.";
                await ctx.reply(answer, this.mainMenuKeyboard);

                // Log the error response too
                await this.logMessage(ctx, question, answer);
            } finally {
                this.processingUsers.delete(userId);
            }
        }
    }
}