export interface GraduationWindow {
  approved: boolean;
  timestamp: string; // ISO date
}

export interface AutonomyState {
  organizationId: string;
  platform: string;
  tier: number;
  status: 'SUPERVISED' | 'GRADUATING' | 'AUTONOMOUS';
  approvalRate: number;
  windowSize: number;
  graduatedAt: string | null;
  regressedAt: string | null;
}

export const GRADUATION_THRESHOLD = 0.95;
export const REGRESSION_THRESHOLD = 0.90;
export const WINDOW_SIZE = 20;
