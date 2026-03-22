import { NotFoundException } from '@nestjs/common';
import { PersonaService } from '../persona.service';
import type {
  WritingStyle,
  ExamplePost,
  ResponseRules,
  PlatformOverride,
} from '../persona.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal mock of PrismaRepository<'persona'> */
function createMockPrismaRepo() {
  return {
    model: {
      persona: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
  };
}

/** Factory for a fully-populated mock Persona object. */
function makePersona(overrides: Record<string, any> = {}): any {
  return {
    id: 'persona-1',
    organizationId: 'org-1',
    name: 'Mav',
    role: 'brand ambassador',
    bio: 'A witty AI that loves startups.',
    tone: ['witty', 'confident'],
    preferredWords: ['innovate', 'disrupt'],
    forbiddenWords: ['synergy', 'pivot'],
    writingStyle: {
      sentenceLength: 'short',
      formality: 'casual',
      emojiUsage: 'minimal',
      hashtagStyle: 'branded',
    } as WritingStyle,
    topics: ['AI', 'startups'],
    examplePosts: [
      { platform: 'twitter', content: 'Ship fast, learn faster.' },
      { platform: 'linkedin', content: 'We just closed our seed round.' },
      { platform: '', content: 'Generic post with no platform.' },
    ] as ExamplePost[],
    responseRules: {
      replyTo: ['mentions'],
      ignoreTopics: ['politics'],
      maxPostsPerDay: 5,
      escalateTo: 'founder@example.com',
    } as ResponseRules,
    platformOverrides: {
      twitter: {
        tone: ['edgy', 'brief'],
        writingStyle: { emojiUsage: 'none' } as Partial<WritingStyle>,
      },
    } as Record<string, PlatformOverride>,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    ...overrides,
  };
}

/** Minimal persona with as little set as possible. */
function makeMinimalPersona(overrides: Record<string, any> = {}): any {
  return {
    id: 'persona-min',
    organizationId: 'org-1',
    name: 'Ghost',
    role: null,
    bio: null,
    tone: [],
    preferredWords: [],
    forbiddenWords: [],
    writingStyle: null,
    topics: [],
    examplePosts: null,
    responseRules: null,
    platformOverrides: null,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PersonaService', () => {
  let service: PersonaService;
  let mockRepo: ReturnType<typeof createMockPrismaRepo>;

  beforeEach(() => {
    mockRepo = createMockPrismaRepo();
    service = new PersonaService(mockRepo as any);
  });

  // =========================================================================
  // buildSystemPrompt
  // =========================================================================
  describe('buildSystemPrompt', () => {
    it('includes persona name and role', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('"Mav"');
      expect(prompt).toContain('a brand ambassador');
    });

    it('includes name without role when role is missing', () => {
      const prompt = service.buildSystemPrompt(makePersona({ role: null }));
      expect(prompt).toContain('"Mav"');
      expect(prompt).toMatch(/You are "Mav"\.$/m);
      expect(prompt).not.toContain(', a ');
    });

    it('includes bio when present', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('Background: A witty AI that loves startups.');
    });

    it('omits bio section when bio is null', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).not.toContain('Background:');
    });

    it('includes platform name when provided', () => {
      const prompt = service.buildSystemPrompt(makePersona(), 'linkedin');
      expect(prompt).toContain('writing content for linkedin');
    });

    it('omits platform line when no platform given', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).not.toContain('writing content for');
    });

    // Tone directives
    it('generates tone directives from tone array', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('witty, confident');
      expect(prompt).toContain('reflect this tone consistently');
    });

    it('omits tone section when tone array is empty', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).not.toContain('Your voice is');
    });

    // Writing style — sentenceLength
    it.each([
      ['short', 'short and punchy'],
      ['medium', 'moderate length'],
      ['long', 'longer, more detailed'],
      ['mixed', 'Vary sentence length'],
    ] as const)(
      'generates sentence length directive for "%s"',
      (value, expected) => {
        const persona = makePersona({
          writingStyle: {
            sentenceLength: value,
            formality: 'neutral',
            emojiUsage: 'minimal',
            hashtagStyle: 'minimal',
          },
        });
        const prompt = service.buildSystemPrompt(persona);
        expect(prompt).toContain(expected);
      }
    );

    // Formality
    it.each([
      ['casual', 'talking to a friend'],
      ['neutral', 'balanced tone'],
      ['formal', 'formal register'],
      ['professional', 'professional language'],
    ] as const)('generates formality directive for "%s"', (value, expected) => {
      const persona = makePersona({
        writingStyle: {
          sentenceLength: 'mixed',
          formality: value,
          emojiUsage: 'minimal',
          hashtagStyle: 'minimal',
        },
      });
      const prompt = service.buildSystemPrompt(persona);
      expect(prompt).toContain(expected);
    });

    // Emoji usage
    it.each([
      ['none', 'Do not use any emojis'],
      ['minimal', 'sparingly'],
      ['moderate', 'add personality'],
      ['heavy', 'liberally'],
    ] as const)(
      'generates emoji usage directive for "%s"',
      (value, expected) => {
        const persona = makePersona({
          writingStyle: {
            sentenceLength: 'mixed',
            formality: 'neutral',
            emojiUsage: value,
            hashtagStyle: 'minimal',
          },
        });
        const prompt = service.buildSystemPrompt(persona);
        expect(prompt).toContain(expected);
      }
    );

    // Hashtag style
    it.each([
      ['none', 'Do not include hashtags'],
      ['minimal', 'one to two relevant hashtags'],
      ['trending', 'trending and relevant hashtags'],
      ['branded', 'branded hashtags'],
    ] as const)(
      'generates hashtag style directive for "%s"',
      (value, expected) => {
        const persona = makePersona({
          writingStyle: {
            sentenceLength: 'mixed',
            formality: 'neutral',
            emojiUsage: 'minimal',
            hashtagStyle: value,
          },
        });
        const prompt = service.buildSystemPrompt(persona);
        expect(prompt).toContain(expected);
      }
    );

    // Preferred / forbidden words
    it('includes preferred words', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('innovate, disrupt');
      expect(prompt).toContain('Preferred vocabulary');
    });

    it('includes forbidden words', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('synergy, pivot');
      expect(prompt).toContain('Never use these words');
    });

    it('omits vocabulary sections when arrays are empty', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).not.toContain('Preferred vocabulary');
      expect(prompt).not.toContain('Never use these words');
    });

    // Topics
    it('includes topics', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('AI, startups');
      expect(prompt).toContain('Areas of expertise');
    });

    it('omits topics section when empty', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).not.toContain('Areas of expertise');
    });

    // Response rules
    it('includes ignoreTopics rule', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('politics');
      expect(prompt).toContain('Never engage with');
    });

    it('includes maxPostsPerDay rule', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('maximum of 5 posts per day');
    });

    it('includes escalateTo rule', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('founder@example.com');
      expect(prompt).toContain('escalate to');
    });

    it('omits content rules when responseRules is null', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).not.toContain('Content rules');
    });

    // Graceful handling of missing fields
    it('handles completely minimal persona without throwing', () => {
      expect(() =>
        service.buildSystemPrompt(makeMinimalPersona())
      ).not.toThrow();
    });

    it('still includes persona name for minimal persona', () => {
      const prompt = service.buildSystemPrompt(makeMinimalPersona());
      expect(prompt).toContain('"Ghost"');
    });

    // Platform overrides via resolveVoice
    it('uses platform override tone instead of base tone', () => {
      const prompt = service.buildSystemPrompt(makePersona(), 'twitter');
      expect(prompt).toContain('edgy, brief');
      expect(prompt).not.toContain('witty, confident');
    });

    it('uses platform override writingStyle merged with base', () => {
      // twitter override sets emojiUsage to 'none', other fields stay from base
      const prompt = service.buildSystemPrompt(makePersona(), 'twitter');
      expect(prompt).toContain('Do not use any emojis');
      // sentenceLength from base ('short') should still be present
      expect(prompt).toContain('short and punchy');
    });

    it('uses base voice when platform has no override', () => {
      const prompt = service.buildSystemPrompt(makePersona(), 'tiktok');
      expect(prompt).toContain('witty, confident');
    });

    it('uses base voice when platformOverrides is null', () => {
      const prompt = service.buildSystemPrompt(
        makeMinimalPersona(),
        'twitter'
      );
      // Should fall through to defaults without erroring
      expect(prompt).toContain('"Ghost"');
    });
  });

  // =========================================================================
  // buildFewShotExamples
  // =========================================================================
  describe('buildFewShotExamples', () => {
    it('returns all examples when no platform specified', () => {
      const examples = service.buildFewShotExamples(makePersona());
      expect(examples).toHaveLength(3);
    });

    it('filters by platform when platform specified', () => {
      const examples = service.buildFewShotExamples(makePersona(), 'twitter');
      expect(examples).toHaveLength(1);
      expect(examples[0].content).toBe('Ship fast, learn faster.');
    });

    it('is case-insensitive on platform match', () => {
      const examples = service.buildFewShotExamples(makePersona(), 'Twitter');
      expect(examples).toHaveLength(1);
    });

    it('falls back to generic (empty platform) examples when no platform match', () => {
      const examples = service.buildFewShotExamples(
        makePersona(),
        'mastodon'
      );
      // mastodon not in any example; should get generic (platform === '')
      expect(examples).toHaveLength(1);
      expect(examples[0].content).toBe('Generic post with no platform.');
    });

    it('falls back to all examples when no generic examples either', () => {
      const persona = makePersona({
        examplePosts: [
          { platform: 'twitter', content: 'tweet' },
          { platform: 'linkedin', content: 'post' },
        ],
      });
      const examples = service.buildFewShotExamples(persona, 'mastodon');
      expect(examples).toHaveLength(2);
    });

    it('handles empty examplePosts array', () => {
      const persona = makePersona({ examplePosts: [] });
      const examples = service.buildFewShotExamples(persona);
      expect(examples).toEqual([]);
    });

    it('handles null examplePosts', () => {
      const persona = makePersona({ examplePosts: null });
      const examples = service.buildFewShotExamples(persona);
      expect(examples).toEqual([]);
    });
  });

  // =========================================================================
  // resolveVoice (tested indirectly via buildSystemPrompt)
  // =========================================================================
  describe('resolveVoice (via buildSystemPrompt)', () => {
    it('base voice used when no platform override', () => {
      const prompt = service.buildSystemPrompt(makePersona());
      expect(prompt).toContain('witty, confident');
    });

    it('platform override replaces tone but keeps base preferredWords', () => {
      // twitter override has tone but no preferredWords
      const prompt = service.buildSystemPrompt(makePersona(), 'twitter');
      expect(prompt).toContain('edgy, brief');
      expect(prompt).toContain('innovate, disrupt');
    });

    it('platform override merges writingStyle partially', () => {
      // twitter overrides emojiUsage only; formality stays 'casual' from base
      const prompt = service.buildSystemPrompt(makePersona(), 'twitter');
      expect(prompt).toContain('Do not use any emojis'); // overridden
      expect(prompt).toContain('talking to a friend'); // from base formality=casual
    });

    it('unknown platform returns base voice', () => {
      const prompt = service.buildSystemPrompt(makePersona(), 'snapchat');
      expect(prompt).toContain('witty, confident');
      expect(prompt).toContain('branded hashtags'); // base hashtagStyle=branded
    });
  });

  // =========================================================================
  // CRUD methods (Prisma-dependent, mocked)
  // =========================================================================
  describe('create', () => {
    it('calls prisma create with correct data', async () => {
      const expected = makePersona();
      mockRepo.model.persona.create.mockResolvedValue(expected);

      const result = await service.create('org-1', {
        name: 'Mav',
        role: 'brand ambassador',
      });

      expect(mockRepo.model.persona.create).toHaveBeenCalledTimes(1);
      expect(
        mockRepo.model.persona.create.mock.calls[0][0].data.organizationId
      ).toBe('org-1');
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('returns all personas for an org ordered by createdAt desc', async () => {
      const personas = [makePersona(), makePersona({ id: 'persona-2' })];
      mockRepo.model.persona.findMany.mockResolvedValue(personas);

      const result = await service.findAll('org-1');

      expect(mockRepo.model.persona.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns persona when found', async () => {
      const persona = makePersona();
      mockRepo.model.persona.findUnique.mockResolvedValue(persona);

      const result = await service.findById('persona-1');
      expect(result).toEqual(persona);
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.model.persona.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('calls findById then prisma update', async () => {
      const persona = makePersona();
      mockRepo.model.persona.findUnique.mockResolvedValue(persona);
      mockRepo.model.persona.update.mockResolvedValue({
        ...persona,
        name: 'Updated',
      });

      const result = await service.update('persona-1', { name: 'Updated' });

      expect(mockRepo.model.persona.findUnique).toHaveBeenCalled();
      expect(mockRepo.model.persona.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException if persona does not exist', async () => {
      mockRepo.model.persona.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'X' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('calls findById then prisma delete', async () => {
      const persona = makePersona();
      mockRepo.model.persona.findUnique.mockResolvedValue(persona);
      mockRepo.model.persona.delete.mockResolvedValue(persona);

      const result = await service.delete('persona-1');

      expect(mockRepo.model.persona.delete).toHaveBeenCalledWith({
        where: { id: 'persona-1' },
      });
      expect(result).toEqual(persona);
    });

    it('throws NotFoundException if persona does not exist', async () => {
      mockRepo.model.persona.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getActive', () => {
    it('returns the active persona for an org', async () => {
      const persona = makePersona();
      mockRepo.model.persona.findFirst.mockResolvedValue(persona);

      const result = await service.getActive('org-1');

      expect(mockRepo.model.persona.findFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
      });
      expect(result).toEqual(persona);
    });

    it('returns null when no active persona', async () => {
      mockRepo.model.persona.findFirst.mockResolvedValue(null);

      const result = await service.getActive('org-1');
      expect(result).toBeNull();
    });
  });

  describe('setActive', () => {
    it('deactivates all then activates the target persona', async () => {
      const persona = makePersona();
      mockRepo.model.persona.findUnique.mockResolvedValue(persona);
      mockRepo.model.persona.updateMany.mockResolvedValue({ count: 1 });
      mockRepo.model.persona.update.mockResolvedValue({
        ...persona,
        isActive: true,
      });

      const result = await service.setActive('org-1', 'persona-1');

      expect(mockRepo.model.persona.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
        data: { isActive: false },
      });
      expect(mockRepo.model.persona.update).toHaveBeenCalledWith({
        where: { id: 'persona-1' },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException if persona does not exist', async () => {
      mockRepo.model.persona.findUnique.mockResolvedValue(null);

      await expect(
        service.setActive('org-1', 'missing')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
