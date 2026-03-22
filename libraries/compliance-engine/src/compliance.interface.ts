export interface ComplianceCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ComplianceResult {
  allowed: boolean;
  checks: ComplianceCheck[];
  riskScore: number;
  contentHash: string;
  transformedContent?: string;
}

export interface PlatformRules {
  platform: string;
  maxCharacters: number;
  maxImages: number;
  maxVideoLengthSec: number;
  maxPostsPerHour: number;
  maxPostsPerDay: number;
  maxRepliesPerHour: number;
  minSecBetweenPosts: number;
  requireBotLabel: boolean;
  botLabelFormat: string | null;
  requireAltText: boolean;
  hashtagLimit: number | null;
  forbiddenPatterns: string[];
  apiCostPerPost: number;
  notes: string | null;
}

export interface ContentPayload {
  text: string;
  images?: Array<{ url: string; altText?: string }>;
  videoLengthSec?: number;
  hashtags?: string[];
  links?: string[];
}

export interface AuditLogEntry {
  organizationId: string;
  action: string;
  agentSessionId?: string;
  personaId?: string;
  platform?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  complianceChecks?: ComplianceCheck[];
  riskScore?: number;
  cost?: number;
}

export interface AuditHistoryFilters {
  action?: string;
  platform?: string;
  personaId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
