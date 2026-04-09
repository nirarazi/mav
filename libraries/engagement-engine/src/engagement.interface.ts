export const TIER_LABELS: Record<number, string> = {
  1: 'passive',
  2: 'acknowledgment',
  3: 'conversational',
  4: 'proactive',
  5: 'sensitive',
};

export interface EngagementCreateInput {
  organizationId: string;
  platform: string;
  externalId: string;
  type: 'MENTION' | 'REPLY' | 'COMMENT' | 'DM' | 'QUOTE';
  incomingText: string;
  authorName: string;
  authorHandle: string;
}

export interface ClassifiedEngagement extends EngagementCreateInput {
  tier: number;
  sentiment: number;
  confidence: number;
}

export interface EngagementFilters {
  platform?: string;
  tier?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  skip?: number;
  take?: number;
}
