import Anthropic from '@anthropic-ai/sdk';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export type LlmProvider = 'openai' | 'anthropic';

export interface GenerateContentOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  examples?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface GenerateContentResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCost: number;
}

// Rough per-token costs (USD) for default models
const COST_PER_TOKEN: Record<LlmProvider, { input: number; output: number }> = {
  openai: { input: 0.0000025, output: 0.00001 }, // gpt-4o
  anthropic: { input: 0.000003, output: 0.000015 }, // claude-sonnet-4-6
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
};

export class LlmService {
  private provider: LlmProvider;
  private model: string;

  constructor() {
    this.provider = this.resolveProvider();
    this.model = this.resolveModel();
  }

  getProvider(): LlmProvider {
    return this.provider;
  }

  getDefaultModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return true; // If constructor didn't throw, we're configured
  }

  async generateContent(options: GenerateContentOptions): Promise<GenerateContentResult> {
    try {
      if (this.provider === 'anthropic') {
        return await this.generateWithAnthropic(options);
      } else {
        return await this.generateWithOpenAI(options);
      }
    } catch (error: any) {
      throw new Error(`LLM generation failed (${this.provider}/${this.model}): ${error.message}`);
    }
  }

  private async generateWithAnthropic(options: GenerateContentOptions): Promise<GenerateContentResult> {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const messages: Anthropic.MessageParam[] = [];

    // Add few-shot examples as conversation turns
    if (options.examples && options.examples.length > 0) {
      for (const ex of options.examples) {
        messages.push({
          role: ex.role,
          content: ex.content,
        });
      }
    }

    // Add the actual user message
    messages.push({
      role: 'user',
      content: options.userMessage,
    });

    const response = await client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature,
      system: options.systemPrompt,
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const usage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    const costs = COST_PER_TOKEN[this.provider];
    const estimatedCost =
      usage.promptTokens * costs.input + usage.completionTokens * costs.output;

    return { text, usage, estimatedCost };
  }

  private async generateWithOpenAI(options: GenerateContentOptions): Promise<GenerateContentResult> {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const generateOptions: any = {
      model: openai(this.model),
      system: options.systemPrompt,
    };

    if (options.examples && options.examples.length > 0) {
      generateOptions.messages = options.examples.map((ex) => ({
        role: ex.role,
        content: ex.content,
      }));
      generateOptions.messages.push({
        role: 'user',
        content: options.userMessage,
      });
    } else {
      generateOptions.prompt = options.userMessage;
    }

    if (options.temperature !== undefined) {
      generateOptions.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      generateOptions.maxTokens = options.maxTokens;
    }

    const result = await generateText(generateOptions);

    const usage = result.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const costs = COST_PER_TOKEN[this.provider];
    const estimatedCost =
      usage.promptTokens * costs.input + usage.completionTokens * costs.output;

    return {
      text: result.text,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
      estimatedCost,
    };
  }

  private resolveProvider(): LlmProvider {
    const envProvider = process.env.MAV_LLM_PROVIDER?.toLowerCase();
    if (envProvider === 'anthropic' || envProvider === 'openai') {
      return envProvider;
    }

    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';

    throw new Error(
      'No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
    );
  }

  private resolveModel(): string {
    return process.env.MAV_LLM_MODEL ?? DEFAULT_MODELS[this.provider];
  }
}
