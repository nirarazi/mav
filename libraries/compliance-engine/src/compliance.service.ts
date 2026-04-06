import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import { ioRedis } from '@mav/nestjs-libraries/redis/redis.service';
import { DEFAULT_PLATFORM_RULES } from './default-rules';
import {
  ComplianceCheck,
  ComplianceResult,
  ContentPayload,
  PlatformRules,
} from './compliance.interface';

const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{16}\b/, // credit card
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // email in content
  /\bpassword\s*[:=]\s*\S+/i, // leaked passwords
  /\b(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*\S+/i, // API keys
];

const SPAM_PATTERNS = [
  /buy\s+now/i,
  /click\s+here\s+to\s+win/i,
  /100%\s+free/i,
  /act\s+now/i,
  /limited\s+time\s+offer/i,
  /double\s+your/i,
];

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRulesForPlatform(platform: string): Promise<PlatformRules> {
    const key = platform.toLowerCase();

    try {
      const dbRule = await this.prisma.complianceRule.findUnique({
        where: { platform: key },
      });

      if (dbRule) {
        return {
          platform: dbRule.platform,
          maxCharacters: dbRule.maxCharacters ?? DEFAULT_PLATFORM_RULES[key]?.maxCharacters ?? 500,
          maxImages: dbRule.maxImages ?? DEFAULT_PLATFORM_RULES[key]?.maxImages ?? 4,
          maxVideoLengthSec: dbRule.maxVideoLengthSec ?? DEFAULT_PLATFORM_RULES[key]?.maxVideoLengthSec ?? 120,
          maxPostsPerHour: dbRule.maxPostsPerHour ?? DEFAULT_PLATFORM_RULES[key]?.maxPostsPerHour ?? 30,
          maxPostsPerDay: dbRule.maxPostsPerDay ?? DEFAULT_PLATFORM_RULES[key]?.maxPostsPerDay ?? 300,
          maxRepliesPerHour: dbRule.maxRepliesPerHour ?? DEFAULT_PLATFORM_RULES[key]?.maxRepliesPerHour ?? 60,
          minSecBetweenPosts: dbRule.minSecBetweenPosts ?? DEFAULT_PLATFORM_RULES[key]?.minSecBetweenPosts ?? 30,
          requireBotLabel: dbRule.requireBotLabel,
          botLabelFormat: dbRule.botLabelFormat ?? DEFAULT_PLATFORM_RULES[key]?.botLabelFormat ?? null,
          requireAltText: dbRule.requireAltText,
          hashtagLimit: dbRule.hashtagLimit ?? DEFAULT_PLATFORM_RULES[key]?.hashtagLimit ?? null,
          forbiddenPatterns: dbRule.forbiddenPatterns ?? [],
          apiCostPerPost: dbRule.apiCostPerPost,
          notes: dbRule.notes ?? null,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch DB rules for ${key}, using defaults: ${error}`);
    }

    const defaults = DEFAULT_PLATFORM_RULES[key];
    if (!defaults) {
      this.logger.warn(`No rules found for platform "${key}", using generic defaults`);
      return {
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
      };
    }

    return defaults;
  }

  async checkContent(
    content: ContentPayload,
    platform: string,
    persona?: string,
  ): Promise<ComplianceResult> {
    const rules = await this.getRulesForPlatform(platform);
    const checks: ComplianceCheck[] = [];

    // Character limit
    if (content.text.length > rules.maxCharacters) {
      checks.push({
        name: 'character_limit',
        passed: false,
        message: `Content is ${content.text.length} chars, exceeds ${platform} limit of ${rules.maxCharacters}`,
        severity: 'error',
      });
    } else {
      checks.push({
        name: 'character_limit',
        passed: true,
        message: `Content is ${content.text.length}/${rules.maxCharacters} chars`,
        severity: 'info',
      });
    }

    // Image count
    if (content.images && content.images.length > rules.maxImages) {
      checks.push({
        name: 'image_limit',
        passed: false,
        message: `${content.images.length} images exceeds ${platform} limit of ${rules.maxImages}`,
        severity: 'error',
      });
    }

    // Video length
    if (content.videoLengthSec && content.videoLengthSec > rules.maxVideoLengthSec) {
      checks.push({
        name: 'video_length',
        passed: false,
        message: `Video is ${content.videoLengthSec}s, exceeds ${platform} limit of ${rules.maxVideoLengthSec}s`,
        severity: 'error',
      });
    }

    // Alt text requirement
    if (rules.requireAltText && content.images?.length) {
      const missingAlt = content.images.filter((img) => !img.altText || img.altText.trim() === '');
      if (missingAlt.length > 0) {
        checks.push({
          name: 'alt_text_required',
          passed: false,
          message: `${missingAlt.length} image(s) missing required alt text for ${platform}`,
          severity: 'error',
        });
      } else {
        checks.push({
          name: 'alt_text_required',
          passed: true,
          message: 'All images have alt text',
          severity: 'info',
        });
      }
    }

    // Hashtag limit
    const hashtagCount = content.hashtags?.length ?? (content.text.match(/#\w+/g) || []).length;
    if (rules.hashtagLimit !== null && hashtagCount > rules.hashtagLimit) {
      checks.push({
        name: 'hashtag_limit',
        passed: false,
        message: `${hashtagCount} hashtags exceeds ${platform} limit of ${rules.hashtagLimit}`,
        severity: 'warning',
      });
    }

    // Bot label check
    if (rules.requireBotLabel) {
      const labelFormat = rules.botLabelFormat;
      const hasLabel = labelFormat
        ? content.text.includes(labelFormat)
        : /\b(bot|automated|auto[-\s]?post)\b/i.test(content.text);

      if (!hasLabel) {
        checks.push({
          name: 'bot_label',
          passed: false,
          message: `Bot disclosure label required for ${platform}${labelFormat ? ` (expected: "${labelFormat}")` : ''}`,
          severity: 'error',
        });
      } else {
        checks.push({
          name: 'bot_label',
          passed: true,
          message: 'Bot label present',
          severity: 'info',
        });
      }
    }

    // Forbidden patterns (platform-specific from DB/defaults)
    for (const pattern of rules.forbiddenPatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content.text)) {
          checks.push({
            name: 'forbidden_pattern',
            passed: false,
            message: `Content matches forbidden pattern: ${pattern}`,
            severity: 'error',
          });
        }
      } catch {
        this.logger.warn(`Invalid forbidden pattern regex: ${pattern}`);
      }
    }

    // Sensitive data detection
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content.text)) {
        checks.push({
          name: 'sensitive_data',
          passed: false,
          message: `Content may contain sensitive data (matched: ${pattern.source})`,
          severity: 'error',
        });
      }
    }

    const contentHash = createHash('sha256').update(content.text).digest('hex');
    const riskScore = this.computeRiskScore(content, platform, checks);
    const hasErrors = checks.some((c) => !c.passed && c.severity === 'error');

    return {
      allowed: !hasErrors,
      checks,
      riskScore,
      contentHash,
    };
  }

  computeRiskScore(
    content: ContentPayload,
    platform: string,
    existingChecks?: ComplianceCheck[],
  ): number {
    let score = 0;

    // Failed checks contribute to risk
    if (existingChecks) {
      const errorCount = existingChecks.filter((c) => !c.passed && c.severity === 'error').length;
      const warningCount = existingChecks.filter((c) => !c.passed && c.severity === 'warning').length;
      score += errorCount * 0.25;
      score += warningCount * 0.1;
    }

    // Link density: many links in short content is suspicious
    const linkCount = (content.text.match(/https?:\/\/\S+/g) || []).length;
    if (linkCount > 0) {
      const linkDensity = linkCount / Math.max(content.text.split(/\s+/).length, 1);
      if (linkDensity > 0.3) {
        score += 0.2;
      }
    }

    // Spam pattern detection
    let spamHits = 0;
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content.text)) {
        spamHits++;
      }
    }
    score += spamHits * 0.15;

    // ALL CAPS detection (more than 50% uppercase in content > 20 chars)
    if (content.text.length > 20) {
      const upperRatio = (content.text.match(/[A-Z]/g) || []).length / content.text.length;
      if (upperRatio > 0.5) {
        score += 0.15;
      }
    }

    // Excessive hashtags
    const hashtagCount = (content.text.match(/#\w+/g) || []).length;
    if (hashtagCount > 10) {
      score += 0.1;
    }

    // Repetitive content detection
    const words = content.text.toLowerCase().split(/\s+/);
    if (words.length > 5) {
      const uniqueRatio = new Set(words).size / words.length;
      if (uniqueRatio < 0.4) {
        score += 0.2;
      }
    }

    return Math.min(score, 1);
  }

  async checkRateLimit(orgId: string, platform: string): Promise<boolean> {
    const rules = await this.getRulesForPlatform(platform);
    const now = Date.now();
    const hourKey = `compliance:rate:${orgId}:${platform}:hour`;
    const dayKey = `compliance:rate:${orgId}:${platform}:day`;
    const lastPostKey = `compliance:rate:${orgId}:${platform}:last`;

    // Check minimum time between posts
    const lastPostTime = await ioRedis.get(lastPostKey);
    if (lastPostTime) {
      const elapsed = (now - parseInt(lastPostTime, 10)) / 1000;
      if (elapsed < rules.minSecBetweenPosts) {
        this.logger.warn(
          `Rate limit: ${orgId}/${platform} - only ${elapsed.toFixed(0)}s since last post (min: ${rules.minSecBetweenPosts}s)`,
        );
        return false;
      }
    }

    // Check hourly limit
    const hourCount = await ioRedis.get(hourKey);
    if (hourCount && parseInt(hourCount, 10) >= rules.maxPostsPerHour) {
      this.logger.warn(`Rate limit: ${orgId}/${platform} - hourly limit reached (${rules.maxPostsPerHour})`,);
      return false;
    }

    // Check daily limit
    const dayCount = await ioRedis.get(dayKey);
    if (dayCount && parseInt(dayCount, 10) >= rules.maxPostsPerDay) {
      this.logger.warn(`Rate limit: ${orgId}/${platform} - daily limit reached (${rules.maxPostsPerDay})`);
      return false;
    }

    return true;
  }

  async recordPost(orgId: string, platform: string): Promise<void> {
    const now = Date.now();
    const hourKey = `compliance:rate:${orgId}:${platform}:hour`;
    const dayKey = `compliance:rate:${orgId}:${platform}:day`;
    const lastPostKey = `compliance:rate:${orgId}:${platform}:last`;

    await ioRedis.set(lastPostKey, now.toString());

    const hourCount = await ioRedis.get(hourKey);
    if (hourCount) {
      await ioRedis.set(hourKey, (parseInt(hourCount, 10) + 1).toString());
    } else {
      await ioRedis.set(hourKey, '1');
    }
    // Set TTL of 1 hour if this is the first post in the window
    if (!hourCount) {
      await (ioRedis as any).expire(hourKey, 3600);
    }

    const dayCount = await ioRedis.get(dayKey);
    if (dayCount) {
      await ioRedis.set(dayKey, (parseInt(dayCount, 10) + 1).toString());
    } else {
      await ioRedis.set(dayKey, '1');
    }
    if (!dayCount) {
      await (ioRedis as any).expire(dayKey, 86400);
    }
  }

  addBotLabel(content: string, platform: string): string {
    const key = platform.toLowerCase();
    const rules = DEFAULT_PLATFORM_RULES[key];

    if (!rules) {
      return content;
    }

    // If platform doesn't require bot label, return as-is
    if (!rules.requireBotLabel) {
      return content;
    }

    const labelFormat = rules.botLabelFormat;

    // If no specific format, use a generic disclosure
    if (!labelFormat) {
      // Mastodon: bot flag is set in profile, not in post text
      if (key === 'mastodon') {
        return content;
      }
      return content;
    }

    // Check if label is already present
    if (content.includes(labelFormat)) {
      return content;
    }

    // Add label: append at the end with a separator
    // For X, ensure we don't exceed character limit
    const separator = '\n\n';
    const labeled = `${content}${separator}${labelFormat}`;

    if (key === 'x' && labeled.length > rules.maxCharacters) {
      // Trim content to fit the label within the char limit
      const availableChars = rules.maxCharacters - separator.length - labelFormat.length;
      if (availableChars > 0) {
        return `${content.slice(0, availableChars)}${separator}${labelFormat}`;
      }
    }

    return labeled;
  }
}
