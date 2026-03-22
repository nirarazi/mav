import {
  ApprovalType,
  ApprovalStatus,
  ApprovalPolicyType,
} from '@prisma/client';

export interface ApprovalRequest {
  orgId: string;
  type: ApprovalType;
  payload: Record<string, unknown>;
  riskScore: number;
  personaId?: string;
  agentSessionId?: string;
}

export interface ApprovalDecision {
  itemId: string;
  approved: boolean;
  decidedBy: string;
  feedback?: string;
}

export interface PolicyConfig {
  orgId: string;
  platform?: string | null;
  actionType?: ApprovalType | null;
  policy: ApprovalPolicyType;
  riskThreshold?: number;
  autoExpireHours?: number;
  autoExpireAction?: ApprovalStatus;
}

export interface AutoExpireConfig {
  hours: number;
  action: ApprovalStatus;
}

export interface ApprovalHistoryFilters {
  type?: ApprovalType;
  status?: ApprovalStatus;
  from?: Date;
  to?: Date;
  personaId?: string;
  skip?: number;
  take?: number;
}
