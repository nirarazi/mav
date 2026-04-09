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
  async findMissed(orgId: string) {
    return this.prisma.engagement.findMany({
      where: {
        organizationId: orgId,
        status: 'SKIPPED',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds a single engagement by ID.
   */
  async findById(id: string) {
    return this.prisma.engagement.findUnique({
      where: { id },
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
