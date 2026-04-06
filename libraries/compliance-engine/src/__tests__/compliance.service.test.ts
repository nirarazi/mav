import { ComplianceService } from '../compliance.service';
import { DEFAULT_PLATFORM_RULES } from '../default-rules';
import type { ContentPayload, PlatformRules } from '../compliance.interface';

// Mock ioRedis at module level (imported by compliance.service.ts)
jest.mock('@mav/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    get: jest.fn(),
    set: jest.fn(),
    expire: jest.fn(),
  },
}));

// Minimal PrismaService mock — we spy on getRulesForPlatform to bypass it
const mockPrisma = {
  complianceRule: {
    findUnique: jest.fn(),
  },
} as any;

function createService(): ComplianceService {
  return new ComplianceService(mockPrisma);
}

function payload(text: string, overrides?: Partial<ContentPayload>): ContentPayload {
  return { text, ...overrides };
}

// ---------------------------------------------------------------------------
// getRulesForPlatform
// ---------------------------------------------------------------------------
describe('ComplianceService.getRulesForPlatform', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = createService();
    jest.clearAllMocks();
  });

  it('returns DB rules when a record exists', async () => {
    mockPrisma.complianceRule.findUnique.mockResolvedValueOnce({
      platform: 'x',
      maxCharacters: 500,
      maxImages: null,
      maxVideoLengthSec: null,
      maxPostsPerHour: null,
      maxPostsPerDay: null,
      maxRepliesPerHour: null,
      minSecBetweenPosts: null,
      requireBotLabel: false,
      botLabelFormat: null,
      requireAltText: false,
      hashtagLimit: null,
      forbiddenPatterns: [],
      apiCostPerPost: 0,
      notes: null,
    });

    const rules = await service.getRulesForPlatform('X');
    expect(rules.platform).toBe('x');
    // DB override
    expect(rules.maxCharacters).toBe(500);
    // Fallback to default for nulls
    expect(rules.maxImages).toBe(DEFAULT_PLATFORM_RULES['x'].maxImages);
  });

  it('falls back to defaults when DB has no record', async () => {
    mockPrisma.complianceRule.findUnique.mockResolvedValueOnce(null);

    const rules = await service.getRulesForPlatform('linkedin');
    expect(rules).toEqual(DEFAULT_PLATFORM_RULES['linkedin']);
  });

  it('returns generic defaults for unknown platforms', async () => {
    mockPrisma.complianceRule.findUnique.mockResolvedValueOnce(null);

    const rules = await service.getRulesForPlatform('myspace');
    expect(rules.platform).toBe('myspace');
    expect(rules.maxCharacters).toBe(500);
    expect(rules.requireBotLabel).toBe(false);
  });

  it('falls back to defaults when Prisma throws', async () => {
    mockPrisma.complianceRule.findUnique.mockRejectedValueOnce(new Error('DB down'));

    const rules = await service.getRulesForPlatform('x');
    expect(rules).toEqual(DEFAULT_PLATFORM_RULES['x']);
  });
});

// ---------------------------------------------------------------------------
// checkContent
// ---------------------------------------------------------------------------
describe('ComplianceService.checkContent', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = createService();
    // Bypass DB entirely — return defaults for the requested platform
    jest.spyOn(service, 'getRulesForPlatform').mockImplementation(async (p) => {
      const key = p.toLowerCase();
      return (
        DEFAULT_PLATFORM_RULES[key] ?? {
          platform: key,
          maxCharacters: 500,
          maxImages: 4,
          maxVideoLengthSec: 120,
          maxPostsPerHour: 30,
          maxPostsPerDay: 300,
          maxRepliesPerHour: 60,
          minSecBetweenPosts: 30,
          requireBotLabel: false,
          botLabelFormat: null,
          requireAltText: false,
          hashtagLimit: null,
          forbiddenPatterns: [],
          apiCostPerPost: 0,
          notes: null,
        }
      );
    });
  });

  // -- Character limits --
  describe('character limits', () => {
    it('passes when X content is within 280 chars', async () => {
      const result = await service.checkContent(
        payload('Hello world #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'character_limit');
      expect(check!.passed).toBe(true);
      expect(result.allowed).toBe(true);
    });

    it('fails when X content exceeds 280 chars', async () => {
      const longText = 'a'.repeat(281);
      const result = await service.checkContent(payload(longText), 'x');
      const check = result.checks.find((c) => c.name === 'character_limit');
      expect(check!.passed).toBe(false);
      expect(check!.severity).toBe('error');
      expect(result.allowed).toBe(false);
    });

    it('passes when LinkedIn content is within 3000 chars', async () => {
      const text = 'x'.repeat(3000);
      const result = await service.checkContent(payload(text), 'linkedin');
      const check = result.checks.find((c) => c.name === 'character_limit');
      expect(check!.passed).toBe(true);
    });

    it('fails when LinkedIn content exceeds 3000 chars', async () => {
      const text = 'x'.repeat(3001);
      const result = await service.checkContent(payload(text), 'linkedin');
      const check = result.checks.find((c) => c.name === 'character_limit');
      expect(check!.passed).toBe(false);
    });
  });

  // -- Image limits --
  describe('image limits', () => {
    it('fails when images exceed platform max', async () => {
      const images = Array.from({ length: 5 }, (_, i) => ({
        url: `img${i}.png`,
      }));
      const result = await service.checkContent(
        payload('Hello #AutomatedPost', { images }),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'image_limit');
      expect(check!.passed).toBe(false);
      expect(check!.severity).toBe('error');
    });

    it('does not add image_limit check when images are within bounds', async () => {
      const images = [{ url: 'img.png' }];
      const result = await service.checkContent(
        payload('Hi #AutomatedPost', { images }),
        'x',
      );
      // The service only pushes image_limit when it fails
      const check = result.checks.find((c) => c.name === 'image_limit');
      expect(check).toBeUndefined();
    });
  });

  // -- Video length --
  describe('video length limits', () => {
    it('fails when video exceeds platform max', async () => {
      const result = await service.checkContent(
        payload('Check this #AutomatedPost', { videoLengthSec: 150 }),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'video_length');
      expect(check!.passed).toBe(false);
    });

    it('does not flag video within limits', async () => {
      const result = await service.checkContent(
        payload('Check this #AutomatedPost', { videoLengthSec: 100 }),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'video_length');
      expect(check).toBeUndefined();
    });
  });

  // -- Alt text (Mastodon) --
  describe('alt text requirements', () => {
    it('fails on Mastodon when images are missing alt text', async () => {
      const images = [{ url: 'img.png' }, { url: 'img2.png', altText: '' }];
      const result = await service.checkContent(
        payload('Hello', { images }),
        'mastodon',
      );
      const check = result.checks.find((c) => c.name === 'alt_text_required');
      expect(check!.passed).toBe(false);
      expect(check!.message).toContain('2 image(s) missing');
    });

    it('passes on Mastodon when all images have alt text', async () => {
      const images = [
        { url: 'img.png', altText: 'A cat' },
        { url: 'img2.png', altText: 'A dog' },
      ];
      const result = await service.checkContent(
        payload('Hello', { images }),
        'mastodon',
      );
      const check = result.checks.find((c) => c.name === 'alt_text_required');
      expect(check!.passed).toBe(true);
    });

    it('does not check alt text for X (not required)', async () => {
      const images = [{ url: 'img.png' }];
      const result = await service.checkContent(
        payload('Hello #AutomatedPost', { images }),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'alt_text_required');
      expect(check).toBeUndefined();
    });
  });

  // -- Hashtag limits --
  describe('hashtag limits', () => {
    it('warns when LinkedIn hashtags exceed 30', async () => {
      const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`);
      const text = 'Post ' + tags.join(' ');
      const result = await service.checkContent(payload(text), 'linkedin');
      const check = result.checks.find((c) => c.name === 'hashtag_limit');
      expect(check!.passed).toBe(false);
      expect(check!.severity).toBe('warning');
    });

    it('does not warn when hashtags are within limit', async () => {
      const result = await service.checkContent(
        payload('Post #one #two #three'),
        'linkedin',
      );
      const check = result.checks.find((c) => c.name === 'hashtag_limit');
      expect(check).toBeUndefined();
    });
  });

  // -- Bot label --
  describe('bot label detection', () => {
    it('fails on X when #AutomatedPost is missing', async () => {
      const result = await service.checkContent(
        payload('Just a normal post'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'bot_label');
      expect(check!.passed).toBe(false);
      expect(check!.severity).toBe('error');
    });

    it('passes on X when #AutomatedPost is present', async () => {
      const result = await service.checkContent(
        payload('My post #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'bot_label');
      expect(check!.passed).toBe(true);
    });

    it('does not check bot label for LinkedIn (requireBotLabel is false)', async () => {
      const result = await service.checkContent(
        payload('A LinkedIn post'),
        'linkedin',
      );
      const check = result.checks.find((c) => c.name === 'bot_label');
      expect(check).toBeUndefined();
    });
  });

  // -- Forbidden patterns --
  describe('forbidden patterns', () => {
    it('detects forbidden content patterns', async () => {
      // Override rules to include a forbidden pattern
      (service.getRulesForPlatform as jest.Mock).mockResolvedValueOnce({
        ...DEFAULT_PLATFORM_RULES['x'],
        forbiddenPatterns: ['gambling', 'casino'],
      });

      const result = await service.checkContent(
        payload('Visit our casino today #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'forbidden_pattern');
      expect(check).toBeDefined();
      expect(check!.passed).toBe(false);
    });
  });

  // -- Sensitive data --
  describe('sensitive data detection', () => {
    it('detects SSN pattern', async () => {
      const result = await service.checkContent(
        payload('My SSN is 123-45-6789 #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'sensitive_data');
      expect(check).toBeDefined();
      expect(check!.passed).toBe(false);
    });

    it('detects credit card numbers', async () => {
      const result = await service.checkContent(
        payload('Card: 1234567890123456 #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'sensitive_data');
      expect(check).toBeDefined();
    });

    it('detects API key patterns', async () => {
      const result = await service.checkContent(
        payload('api_key=sk_live_abc123 #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'sensitive_data');
      expect(check).toBeDefined();
    });

    it('detects password patterns', async () => {
      const result = await service.checkContent(
        payload('password: hunter2 #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'sensitive_data');
      expect(check).toBeDefined();
    });

    it('does not flag clean content', async () => {
      const result = await service.checkContent(
        payload('Just a normal tweet #AutomatedPost'),
        'x',
      );
      const check = result.checks.find((c) => c.name === 'sensitive_data');
      expect(check).toBeUndefined();
    });
  });

  // -- Allowed field --
  describe('allowed field', () => {
    it('is false when any error-severity check fails', async () => {
      // Exceed char limit on X (error severity)
      const result = await service.checkContent(
        payload('a'.repeat(300) + ' #AutomatedPost'),
        'x',
      );
      expect(result.allowed).toBe(false);
    });

    it('is true when only warnings exist (no errors)', async () => {
      // LinkedIn with >30 hashtags = warning, but content otherwise clean
      const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`);
      const result = await service.checkContent(
        payload('Post ' + tags.join(' ')),
        'linkedin',
      );
      // hashtag_limit is a warning, not an error
      const errors = result.checks.filter(
        (c) => !c.passed && c.severity === 'error',
      );
      expect(errors.length).toBe(0);
      expect(result.allowed).toBe(true);
    });
  });

  // -- Content hash --
  describe('content hash', () => {
    it('returns a valid 64-char hex SHA-256 hash', async () => {
      const result = await service.checkContent(
        payload('test #AutomatedPost'),
        'x',
      );
      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different hashes for different content', async () => {
      const r1 = await service.checkContent(payload('hello #AutomatedPost'), 'x');
      const r2 = await service.checkContent(payload('world #AutomatedPost'), 'x');
      expect(r1.contentHash).not.toBe(r2.contentHash);
    });
  });
});

// ---------------------------------------------------------------------------
// computeRiskScore
// ---------------------------------------------------------------------------
describe('ComplianceService.computeRiskScore', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = createService();
  });

  it('returns 0 for clean content with no failed checks', () => {
    const score = service.computeRiskScore(payload('Hello world'), 'x', []);
    expect(score).toBe(0);
  });

  it('adds 0.25 per error-severity failed check', () => {
    const checks = [
      { name: 'a', passed: false, message: '', severity: 'error' as const },
      { name: 'b', passed: false, message: '', severity: 'error' as const },
    ];
    const score = service.computeRiskScore(payload('Hello world'), 'x', checks);
    expect(score).toBeCloseTo(0.5);
  });

  it('adds 0.1 per warning-severity failed check', () => {
    const checks = [
      { name: 'a', passed: false, message: '', severity: 'warning' as const },
    ];
    const score = service.computeRiskScore(payload('Hello world'), 'x', checks);
    expect(score).toBeCloseTo(0.1);
  });

  it('detects high link density (>30% links)', () => {
    // 3 links out of ~6 words => density ~0.5
    const text = 'Check https://a.com https://b.com https://c.com out today folks';
    const score = service.computeRiskScore(payload(text), 'x');
    expect(score).toBeGreaterThanOrEqual(0.2);
  });

  it('does not penalize low link density', () => {
    const text =
      'This is a longer post with just one link https://example.com and lots of other words filling the space';
    const score = service.computeRiskScore(payload(text), 'x');
    // No other risk factors, low link density => 0
    expect(score).toBe(0);
  });

  it('detects spam patterns (buy now, click here to win, etc.)', () => {
    const text = 'Buy now and get 100% free stuff! Act now!';
    const score = service.computeRiskScore(payload(text), 'x');
    // buy now + 100% free + act now = 3 hits * 0.15 = 0.45
    expect(score).toBeCloseTo(0.45, 5);
  });

  it('detects ALL CAPS content (>50% uppercase in 20+ char text)', () => {
    const text = 'THIS IS ALL CAPS CONTENT HERE PEOPLE LOOK AT ME';
    const score = service.computeRiskScore(payload(text), 'x');
    expect(score).toBeGreaterThanOrEqual(0.15);
  });

  it('does not penalize short ALL CAPS content (<= 20 chars)', () => {
    const text = 'OMG YES';
    const score = service.computeRiskScore(payload(text), 'x');
    // short text => no caps penalty
    expect(score).toBe(0);
  });

  it('detects excessive hashtags (>10)', () => {
    const tags = Array.from({ length: 12 }, (_, i) => `#tag${i}`).join(' ');
    const text = `Post ${tags}`;
    const score = service.computeRiskScore(payload(text), 'x');
    expect(score).toBeGreaterThanOrEqual(0.1);
  });

  it('detects repetitive content (unique word ratio < 0.4)', () => {
    // 10 words, only 2 unique => ratio = 0.2
    const text = 'spam spam spam spam spam spam spam spam click click';
    const score = service.computeRiskScore(payload(text), 'x');
    expect(score).toBeGreaterThanOrEqual(0.2);
  });

  it('caps score at 1.0', () => {
    // Combine many risk factors
    const checks = Array.from({ length: 10 }, (_, i) => ({
      name: `err${i}`,
      passed: false,
      message: '',
      severity: 'error' as const,
    }));
    const text =
      'BUY NOW CLICK HERE TO WIN 100% FREE ACT NOW LIMITED TIME OFFER DOUBLE YOUR #a #b #c #d #e #f #g #h #i #j #k #l spam spam spam spam spam spam spam spam spam spam https://a.com https://b.com https://c.com';
    const score = service.computeRiskScore(payload(text), 'x', checks);
    expect(score).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// addBotLabel
// ---------------------------------------------------------------------------
describe('ComplianceService.addBotLabel', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = createService();
  });

  it('adds #AutomatedPost for X', () => {
    const result = service.addBotLabel('Hello world', 'x');
    expect(result).toBe('Hello world\n\n#AutomatedPost');
  });

  it('does not add label for LinkedIn (requireBotLabel is false)', () => {
    const result = service.addBotLabel('Hello world', 'linkedin');
    expect(result).toBe('Hello world');
  });

  it('does not duplicate label if already present', () => {
    const result = service.addBotLabel('Hello #AutomatedPost', 'x');
    expect(result).toBe('Hello #AutomatedPost');
  });

  it('trims content to fit within X char limit', () => {
    const longContent = 'a'.repeat(280);
    const result = service.addBotLabel(longContent, 'x');
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result).toContain('#AutomatedPost');
  });

  it('returns content unchanged for unknown platforms', () => {
    const result = service.addBotLabel('Hello', 'myspace');
    expect(result).toBe('Hello');
  });

  it('returns content unchanged for Mastodon (bot flag is profile-based)', () => {
    const result = service.addBotLabel('Hello', 'mastodon');
    expect(result).toBe('Hello');
  });

  it('returns content unchanged for Bluesky (requireBotLabel is false)', () => {
    const result = service.addBotLabel('Hello', 'bluesky');
    expect(result).toBe('Hello');
  });
});
