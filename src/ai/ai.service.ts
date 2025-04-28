// ai/ai.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { JinaEmbeddings } from '@langchain/community/embeddings/jina';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import { Document } from 'langchain/document';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AIService implements OnModuleInit {
    private model: ChatOpenAI;
    private retrievalChain: any;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        await this.initializeAI();
    }

    private async initializeAI() {
        // Initialize embeddings
        const embeddings = new JinaEmbeddings({
            apiKey:
                'jina_f716f87e4f4743e48e67a2209a938ce4g8F_YasntYs2d9wDKQfGERceMROD',
            model: 'jina-clip-v2',
        });

        // Load documents
        const raw = await fs.readFile(path.resolve('./data/doc.json'), 'utf-8');
        const docs = JSON.parse(raw);
        const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
        const baseRetriever = vectorStore.asRetriever({ k: 30 });

        // Initialize model
        this.model = new ChatOpenAI({
            openAIApiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'google/gemini-2.5-pro-preview-03-25',
        });

        // Create multi-query retriever
        const multiQueryRetriever = MultiQueryRetriever.fromLLM({
            llm: this.model,
            retriever: baseRetriever,
            verbose: true,
        });

        // Set up prompt template
        const prompt = ChatPromptTemplate.fromTemplate(
            `You are a customer support ai for prop trading firms.
      Answer the user's question *only* based on the following context.
      <context>
      {context}
      </context>
      Question: {input}
      If the answer is not in the context, say "متاسفانه دراین رابطه اطلاعی ندارم".
      never use word "context" use "data" instead 
      Be kind and use appropriate (not excessive) emojis. dont use markdown format in your answer. just raw text and emojies, don't say hello if user not said hello to you.`,
        );

        // Create chain
        const combineDocsChain = await createStuffDocumentsChain({
            llm: this.model,
            prompt,
        });

        this.retrievalChain = await createRetrievalChain({
            combineDocsChain,
            retriever: multiQueryRetriever,
        });
    }

    async getAnswer(question: string): Promise<string> {
        try {
            const response = await this.retrievalChain.invoke({ input: question });
            return response.answer;
        } catch (error) {
            console.error('Error getting AI answer:', error);
            throw error;
        }
    }
}
