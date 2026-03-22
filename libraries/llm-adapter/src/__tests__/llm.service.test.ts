/**
 * LLM Adapter tests — TDD RED phase
 * Tests the provider-agnostic LLM service that wraps Vercel AI SDK.
 */

// We need to mock these BEFORE importing the service
const mockGenerateText = jest.fn();

jest.mock('ai', () => ({
  generateText: mockGenerateText,
}), { virtual: true });

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn((model: string) => ({ id: `openai:${model}` }))),
}), { virtual: true });

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => jest.fn((model: string) => ({ id: `anthropic:${model}` }))),
}), { virtual: true });

import { LlmService, LlmProvider, GenerateContentOptions } from '../llm.service';

describe('LlmService', () => {
  let service: LlmService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MAVERICK_LLM_PROVIDER;
    delete process.env.MAVERICK_LLM_MODEL;
  });

  describe('constructor and provider resolution', () => {
    it('defaults to openai provider when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new LlmService();
      expect(service.getProvider()).toBe('openai');
    });

    it('uses anthropic when ANTHROPIC_API_KEY is set and OPENAI is not', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      service = new LlmService();
      expect(service.getProvider()).toBe('anthropic');
    });

    it('respects MAVERICK_LLM_PROVIDER override', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.MAVERICK_LLM_PROVIDER = 'anthropic';
      service = new LlmService();
      expect(service.getProvider()).toBe('anthropic');
    });

    it('throws when no API key is configured', () => {
      expect(() => new LlmService()).toThrow(/No LLM provider configured/);
    });
  });

  describe('getDefaultModel', () => {
    it('returns gpt-4o for openai', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      service = new LlmService();
      expect(service.getDefaultModel()).toBe('gpt-4o');
    });

    it('returns claude-sonnet-4-20250514 for anthropic', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      service = new LlmService();
      expect(service.getDefaultModel()).toBe('claude-sonnet-4-20250514');
    });

    it('respects MAVERICK_LLM_MODEL override', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.MAVERICK_LLM_MODEL = 'gpt-4o-mini';
      service = new LlmService();
      expect(service.getDefaultModel()).toBe('gpt-4o-mini');
    });
  });

  describe('generateContent', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test';
      service = new LlmService();
    });

    it('calls generateText with system prompt and user message', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'AI agents are transforming how we build software.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      } as any);

      const result = await service.generateContent({
        systemPrompt: 'You are Alex Chen, a SaaS founder.',
        userMessage: 'Write a LinkedIn post about AI agents.',
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.system).toBe('You are Alex Chen, a SaaS founder.');
      expect(callArgs.prompt).toBe('Write a LinkedIn post about AI agents.');
      expect(result.text).toBe('AI agents are transforming how we build software.');
      expect(result.usage.totalTokens).toBe(150);
    });

    it('passes temperature and maxTokens when provided', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Generated content',
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      } as any);

      await service.generateContent({
        systemPrompt: 'You are a writer.',
        userMessage: 'Write something.',
        temperature: 0.7,
        maxTokens: 500,
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.7);
      expect(callArgs.maxTokens).toBe(500);
    });

    it('includes few-shot examples in the system prompt when provided', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'New post content',
        usage: { promptTokens: 200, completionTokens: 60, totalTokens: 260 },
      } as any);

      await service.generateContent({
        systemPrompt: 'You are Alex Chen.',
        userMessage: 'Write a post.',
        examples: [
          { role: 'user' as const, content: 'Write about AI' },
          { role: 'assistant' as const, content: 'AI is changing everything...' },
        ],
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.messages).toBeDefined();
      // 2 few-shot examples + 1 user message = 3
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0].role).toBe('user');
      expect(callArgs.messages[1].role).toBe('assistant');
      expect(callArgs.messages[2].role).toBe('user');
      expect(callArgs.messages[2].content).toBe('Write a post.');
    });

    it('returns cost estimate based on token usage', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Content',
        usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
      } as any);

      const result = await service.generateContent({
        systemPrompt: 'System',
        userMessage: 'Message',
      });

      expect(result.usage.totalTokens).toBe(1500);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('wraps AI SDK errors with a meaningful message', async () => {
      mockGenerateText.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        service.generateContent({
          systemPrompt: 'System',
          userMessage: 'Message',
        })
      ).rejects.toThrow(/LLM generation failed/);
    });
  });

  describe('isConfigured', () => {
    it('returns true when a provider is available', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      service = new LlmService();
      expect(service.isConfigured()).toBe(true);
    });
  });
});
