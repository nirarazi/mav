import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

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
  anthropic: { input: 0.000003, output: 0.000015 }, // claude-sonnet
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
};

export class LlmService {
  private provider: LlmProvider;
  private model: string;
  private modelInstance: any;

  constructor() {
    this.provider = this.resolveProvider();
    this.model = this.resolveModel();
    this.modelInstance = this.createModelInstance();
  }

  getProvider(): LlmProvider {
    return this.provider;
  }

  getDefaultModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return !!this.modelInstance;
  }

  async generateContent(options: GenerateContentOptions): Promise<GenerateContentResult> {
    try {
      const generateOptions: any = {
        model: this.modelInstance,
        system: options.systemPrompt,
      };

      if (options.examples && options.examples.length > 0) {
        // Use messages format with few-shot examples
        generateOptions.messages = options.examples.map((ex) => ({
          role: ex.role,
          content: ex.content,
        }));
        // Append the user message as the last message
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
    } catch (error: any) {
      throw new Error(`LLM generation failed (${this.provider}/${this.model}): ${error.message}`);
    }
  }

  private resolveProvider(): LlmProvider {
    const envProvider = process.env.MAVERICK_LLM_PROVIDER?.toLowerCase();
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
    return process.env.MAVERICK_LLM_MODEL ?? DEFAULT_MODELS[this.provider];
  }

  private createModelInstance(): any {
    switch (this.provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        return openai(this.model);
      }
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        return anthropic(this.model);
      }
      default:
        throw new Error(`Unknown LLM provider: ${this.provider}`);
    }
  }
}
