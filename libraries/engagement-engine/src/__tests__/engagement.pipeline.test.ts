import { EngagementPipeline } from '../engagement.pipeline';

function buildPersonaService() {
  return {
    getActive: jest.fn().mockResolvedValue({
      id: 'persona-1',
      name: 'TestBot',
      tone: ['friendly', 'professional'],
      topics: ['tech', 'AI'],
      replyStyle: 'Casual and warm. Keep replies short.',
      boundaries: ['politics'],
      escalationPhrases: ['lawsuit', 'refund'],
      complaintPlaybook: 'Acknowledge, empathize, offer help.',
      engagementExamples: {
        acknowledgment: [{ incoming: 'Great post!', response: 'Thanks! Glad it resonated.' }],
      },
    }),
    buildSystemPrompt: jest.fn().mockReturnValue('You are TestBot.'),
  } as any;
}

function buildComplianceService() {
  return {
    checkContent: jest.fn().mockResolvedValue({
      allowed: true,
      riskScore: 0.1,
      checks: [],
      contentHash: 'abc123',
    }),
    checkRateLimit: jest.fn().mockResolvedValue(true),
  } as any;
}

describe('EngagementPipeline', () => {
  describe('shouldSkip()', () => {
    it('returns true when incoming text matches a boundary topic', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldSkip(
        'What do you think about the elections?',
        { boundaries: ['politics', 'elections'], escalationPhrases: [] }
      );

      expect(result).toBe(true);
    });

    it('returns false when text does not match any boundary', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldSkip(
        'How does your AI work?',
        { boundaries: ['politics'], escalationPhrases: [] }
      );

      expect(result).toBe(false);
    });
  });

  describe('shouldEscalate()', () => {
    it('returns true when text contains an escalation phrase', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldEscalate(
        'I want a refund immediately',
        { boundaries: [], escalationPhrases: ['refund', 'lawsuit'] }
      );

      expect(result).toBe(true);
    });

    it('returns false when text does not contain any escalation phrase', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldEscalate(
        'I love your product!',
        { boundaries: [], escalationPhrases: ['refund', 'lawsuit'] }
      );

      expect(result).toBe(false);
    });
  });

  describe('checkCompliance()', () => {
    it('delegates to compliance service with correct shape', async () => {
      const complianceService = buildComplianceService();
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        complianceService
      );

      await pipeline.checkCompliance('Thanks for reaching out!', 'x');

      expect(complianceService.checkContent).toHaveBeenCalledWith(
        { text: 'Thanks for reaching out!', images: [], videos: [] },
        'x'
      );
    });
  });

  describe('buildReplySystemPrompt()', () => {
    it('includes reply style and complaint playbook for sensitive tier', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const prompt = pipeline.buildReplySystemPrompt(
        {
          name: 'TestBot',
          tone: ['friendly'],
          replyStyle: 'Keep replies under 280 chars.',
          complaintPlaybook: 'Acknowledge then empathize.',
          engagementExamples: {},
        } as any,
        'x',
        5 // sensitive tier
      );

      expect(prompt).toContain('Keep replies under 280 chars');
      expect(prompt).toContain('Acknowledge then empathize');
    });

    it('includes few-shot examples for the tier', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const prompt = pipeline.buildReplySystemPrompt(
        {
          name: 'TestBot',
          tone: ['friendly'],
          replyStyle: 'Be warm.',
          engagementExamples: {
            acknowledgment: [{ incoming: 'Nice!', response: 'Thanks!' }],
          },
        } as any,
        'x',
        2 // acknowledgment tier
      );

      expect(prompt).toContain('Nice!');
      expect(prompt).toContain('Thanks!');
    });
  });
});
