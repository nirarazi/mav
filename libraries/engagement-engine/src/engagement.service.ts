import { Injectable, Logger } from '@nestjs/common';
import { ClassifiedEngagement, EngagementFilters } from './engagement.interface';

const QUESTION_WORDS = ['who', 'what', 'when', 'where', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'should', 'do', 'does', 'did'];

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: any) {}

  /**
   * Creates an engagement record from a classified engagement.
   */
  async create(data: ClassifiedEngagement) {
    return this.prisma.engagement.create({
      data: {
        organizationId: data.organizationId,
        platform: data.platform,
        externalId: data.externalId,
        type: data.type,
        incomingText: data.incomingText,
        authorName: data.authorName,
        authorHandle: data.authorHandle,
        tier: data.tier,
        sentiment: data.sentiment,
        confidence: data.confidence,
        status: 'PENDING',
      },
    });
  }

  /**
   * Finds engagements for an org with optional filters, ordered by createdAt desc.
   */
  async findByOrg(orgId: string, filters: EngagementFilters = {}) {
    const where: Record<string, unknown> = { organizationId: orgId };

    if (filters.platform !== undefined) {
      where['platform'] = filters.platform;
    }
    if (filters.tier !== undefined) {
      where['tier'] = filters.tier;
    }
    if (filters.status !== undefined) {
      where['status'] = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as any).gte = filters.dateFrom;
      if (filters.dateTo) (where.createdAt as any).lte = filters.dateTo;
    }

    return this.prisma.engagement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.take,
    });
  }

  /**
   * Finds all SKIPPED engagements for an org.
   */
  async findMissed(orgId: string, skip = 0, take = 100) {
    return this.prisma.engagement.findMany({
      where: {
        organizationId: orgId,
        status: 'SKIPPED',
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Finds a single engagement by ID.
   */
  async findById(id: string, orgId: string) {
    return this.prisma.engagement.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  /**
   * Marks an engagement as RESPONDED with the given response text.
   */
  async markResponded(id: string, responseText: string, approvalId?: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: {
        status: 'RESPONDED',
        responseText,
        respondedAt: new Date(),
        ...(approvalId !== undefined ? { approvalId } : {}),
      },
    });
  }

  /**
   * Marks an engagement as SKIPPED.
   */
  async markSkipped(id: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: { status: 'SKIPPED' },
    });
  }

  /**
   * Marks an engagement as ESCALATED with the given approval ID.
   */
  async markEscalated(id: string, approvalId: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: {
        status: 'ESCALATED',
        approvalId,
      },
    });
  }

  /**
   * Classifies an engagement into a tier (1–5) based on type, sentiment, and text.
   *
   * Tier definitions:
   *  1 - passive
   *  2 - acknowledgment
   *  3 - conversational
   *  4 - proactive
   *  5 - sensitive
   */
  classifyTier(
    type: ClassifiedEngagement['type'],
    sentiment: number,
    text: string
  ): number {
    // DMs are always sensitive
    if (type === 'DM') return 5;

    // Strongly negative sentiment → sensitive
    if (sentiment < -0.3) return 5;

    // Very short or emoji-only content with neutral/positive sentiment → passive
    const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(text.trim());
    if ((text.trim().length === 0 || isEmojiOnly) && sentiment >= 0) return 1;

    // QUOTEs are proactive
    if (type === 'QUOTE') return 4;

    // Contains a question mark or starts with a question word → conversational
    const trimmedLower = text.trim().toLowerCase();
    const firstWord = trimmedLower.split(/\s+/)[0];
    if (text.includes('?') || QUESTION_WORDS.includes(firstWord)) return 3;

    // Positive sentiment with short text → acknowledgment
    if (sentiment > 0 && text.length < 200) return 2;

    // Long text → conversational
    if (text.length >= 200) return 3;

    // MENTION or REPLY → default acknowledgment
    if (type === 'MENTION' || type === 'REPLY') return 2;

    // Fallback → conversational
    return 3;
  }
}
