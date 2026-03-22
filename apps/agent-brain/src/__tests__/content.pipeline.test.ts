/**
 * Content Pipeline tests — TDD RED phase
 *
 * The content pipeline is the heart of autonomous posting:
 *   persona.buildSystemPrompt() → llm.generateContent() → compliance.checkContent()
 *   → compliance.addBotLabel() → approval.submit()
 *
 * Each step is tested individually, then the full pipeline end-to-end.
 */

const mockGenerateContent = jest.fn();
const mockBuildSystemPrompt = jest.fn();
const mockBuildFewShotExamples = jest.fn();
const mockFindById = jest.fn();
const mockGetActive = jest.fn();
const mockCheckContent = jest.fn();
const mockAddBotLabel = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockRecordPost = jest.fn();
const mockSubmit = jest.fn();
const mockAuditLog = jest.fn();

import { ContentPipeline, ContentRequest, ContentResult } from '../content.pipeline';

describe('ContentPipeline', () => {
  let pipeline: ContentPipeline;

  const mockPersonaService = {
    findById: mockFindById,
    getActive: mockGetActive,
    buildSystemPrompt: mockBuildSystemPrompt,
    buildFewShotExamples: mockBuildFewShotExamples,
  };

  const mockLlmService = {
    generateContent: mockGenerateContent,
    isConfigured: jest.fn().mockReturnValue(true),
  };

  const mockComplianceService = {
    checkContent: mockCheckContent,
    addBotLabel: mockAddBotLabel,
    checkRateLimit: mockCheckRateLimit,
    recordPost: mockRecordPost,
  };

  const mockApprovalService = {
    submit: mockSubmit,
  };

  const mockAuditService = {
    log: mockAuditLog,
  };

  const mockPersona = {
    id: 'persona-1',
    name: 'Alex Chen',
    role: 'Founder',
    bio: 'Building AI agents',
    tone: ['professional', 'witty'],
    preferredWords: ['AI', 'agents'],
    forbiddenWords: ['synergy'],
    writingStyle: { sentenceLength: 'short', formality: 'professional', emojiUsage: 'minimal', hashtagStyle: 'none' },
    topics: ['AI agents', 'startups'],
    examplePosts: [
      { platform: 'x', content: 'Hot take: AI agents will replace 90% of SaaS tools.' },
      { platform: 'linkedin', content: '5 lessons from building AI agents that ship.' },
    ],
    responseRules: { ignoreTopics: ['politics'], maxPostsPerDay: 5 },
    platformOverrides: {},
    isActive: true,
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    pipeline = new ContentPipeline(
      mockPersonaService as any,
      mockLlmService as any,
      mockComplianceService as any,
      mockApprovalService as any,
      mockAuditService as any,
    );

    // Default happy-path mocks
    mockGetActive.mockResolvedValue(mockPersona);
    mockFindById.mockResolvedValue(mockPersona);
    mockBuildSystemPrompt.mockReturnValue('You are Alex Chen, a Founder.');
    mockBuildFewShotExamples.mockReturnValue([]);
    mockGenerateContent.mockResolvedValue({
      text: 'AI agents are the future of work. Here is why.',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      estimatedCost: 0.001,
    });
    mockCheckContent.mockResolvedValue({
      allowed: true,
      checks: [{ name: 'character_limit', passed: true, message: '50/280', severity: 'info' }],
      riskScore: 0.1,
      contentHash: 'abc123',
    });
    mockAddBotLabel.mockReturnValue('AI agents are the future of work. Here is why.\n\n#AutomatedPost');
    mockCheckRateLimit.mockResolvedValue(true);
    mockSubmit.mockResolvedValue({
      id: 'approval-1',
      status: 'PENDING',
      type: 'POST',
      payload: {},
      riskScore: 0.1,
    });
    mockAuditLog.mockResolvedValue(undefined);
  });

  describe('generatePost', () => {
    it('generates a post using the active persona when no personaId specified', async () => {
      const request: ContentRequest = {
        orgId: 'org-1',
        platform: 'x',
        topic: 'AI agents replacing SaaS tools',
      };

      await pipeline.generatePost(request);

      expect(mockGetActive).toHaveBeenCalledWith('org-1');
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(mockPersona, 'x');
    });

    it('uses specified personaId when provided', async () => {
      const request: ContentRequest = {
        orgId: 'org-1',
        platform: 'x',
        topic: 'AI agents',
        personaId: 'persona-1',
      };

      await pipeline.generatePost(request);

      expect(mockFindById).toHaveBeenCalledWith('persona-1');
      expect(mockGetActive).not.toHaveBeenCalled();
    });

    it('calls LLM with persona system prompt and platform-specific user message', async () => {
      const request: ContentRequest = {
        orgId: 'org-1',
        platform: 'x',
        topic: 'AI agents replacing SaaS',
      };

      await pipeline.generatePost(request);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.systemPrompt).toBe('You are Alex Chen, a Founder.');
      expect(callArgs.userMessage).toContain('x');
      expect(callArgs.userMessage).toContain('AI agents replacing SaaS');
    });

    it('includes platform character limit in the user message', async () => {
      const request: ContentRequest = {
        orgId: 'org-1',
        platform: 'x',
        topic: 'Something',
      };

      await pipeline.generatePost(request);

      const userMessage = mockGenerateContent.mock.calls[0][0].userMessage;
      expect(userMessage).toContain('280'); // X character limit
    });

    it('runs compliance check on generated content', async () => {
      await pipeline.generatePost({
        orgId: 'org-1',
        platform: 'x',
        topic: 'Test',
      });

      expect(mockCheckContent).toHaveBeenCalledTimes(1);
      const checkArgs = mockCheckContent.mock.calls[0];
      expect(checkArgs[0].text).toBe('AI agents are the future of work. Here is why.');
      expect(checkArgs[1]).toBe('x');
    });

    it('adds bot label when platform requires it', async () => {
      await pipeline.generatePost({
        orgId: 'org-1',
        platform: 'x',
        topic: 'Test',
      });

      expect(mockAddBotLabel).toHaveBeenCalledWith(
        'AI agents are the future of work. Here is why.',
        'x',
      );
    });

    it('submits to approval queue with correct metadata', async () => {
      const result = await pipeline.generatePost({
        orgId: 'org-1',
        platform: 'x',
        topic: 'Test topic',
      });

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      const submitArgs = mockSubmit.mock.calls[0];
      expect(submitArgs[0]).toBe('org-1'); // orgId
      expect(submitArgs[1]).toBe('POST'); // type
      expect(submitArgs[2]).toMatchObject({
        platform: 'x',
        content: expect.any(String),
        topic: 'Test topic',
        personaId: 'persona-1',
      });
      expect(submitArgs[3]).toBe(0.1); // riskScore from compliance
    });

    it('returns the full result with content, compliance, and approval info', async () => {
      const result = await pipeline.generatePost({
        orgId: 'org-1',
        platform: 'x',
        topic: 'Test',
      });

      expect(result).toMatchObject({
        content: expect.any(String),
        platform: 'x',
        personaId: 'persona-1',
        complianceResult: { allowed: true, riskScore: 0.1 },
        approvalItem: { id: 'approval-1', status: 'PENDING' },
        llmUsage: { totalTokens: 150 },
      });
    });

    it('checks rate limit before generating', async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      await expect(
        pipeline.generatePost({ orgId: 'org-1', platform: 'x', topic: 'Test' }),
      ).rejects.toThrow(/rate limit/i);
    });

    it('throws when compliance check fails with errors', async () => {
      mockCheckContent.mockResolvedValue({
        allowed: false,
        checks: [{ name: 'character_limit', passed: false, message: 'Too long', severity: 'error' }],
        riskScore: 0.8,
        contentHash: 'def456',
      });

      await expect(
        pipeline.generatePost({ orgId: 'org-1', platform: 'x', topic: 'Test' }),
      ).rejects.toThrow(/compliance/i);
    });

    it('throws when no active persona and no personaId specified', async () => {
      mockGetActive.mockResolvedValue(null);

      await expect(
        pipeline.generatePost({ orgId: 'org-1', platform: 'x', topic: 'Test' }),
      ).rejects.toThrow(/persona/i);
    });

    it('logs to audit trail', async () => {
      await pipeline.generatePost({
        orgId: 'org-1',
        platform: 'x',
        topic: 'Test',
      });

      expect(mockAuditLog).toHaveBeenCalled();
      const logArgs = mockAuditLog.mock.calls[0];
      expect(logArgs[0]).toBe('org-1');
      expect(logArgs[1]).toBe('POST_GENERATED');
    });
  });

  describe('adaptForPlatform', () => {
    it('includes X-specific constraints (280 chars, no hashtags)', () => {
      const prompt = pipeline.buildPlatformPrompt('x', 'Write about AI');
      expect(prompt).toContain('280');
      expect(prompt).toContain('x');
    });

    it('includes LinkedIn-specific constraints (3000 chars)', () => {
      const prompt = pipeline.buildPlatformPrompt('linkedin', 'Write about AI');
      expect(prompt).toContain('3000');
      expect(prompt).toContain('linkedin');
    });

    it('includes Bluesky-specific constraints (300 chars)', () => {
      const prompt = pipeline.buildPlatformPrompt('bluesky', 'Write about AI');
      expect(prompt).toContain('300');
    });
  });
});
