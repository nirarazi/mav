import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import { AuditLogEntry, AuditHistoryFilters } from './compliance.interface';
import { AuditLog } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    orgId: string,
    action: string,
    metadata: Omit<AuditLogEntry, 'organizationId' | 'action'> = {},
  ): Promise<AuditLog> {
    try {
      const entry = await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          action,
          agentSessionId: metadata.agentSessionId ?? null,
          personaId: metadata.personaId ?? null,
          platform: metadata.platform ?? null,
          contentHash: metadata.contentHash ?? null,
          metadata: metadata.metadata ? JSON.parse(JSON.stringify(metadata.metadata)) : null,
          complianceChecks: metadata.complianceChecks
            ? JSON.parse(JSON.stringify(metadata.complianceChecks))
            : null,
          riskScore: metadata.riskScore ?? 0,
          cost: metadata.cost ?? 0,
        },
      });

      this.logger.log(`Audit: ${orgId} | ${action} | risk=${entry.riskScore}`);
      return entry;
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error}`);
      throw error;
    }
  }

  async getHistory(
    orgId: string,
    filters: AuditHistoryFilters = {},
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.platform) {
      where.platform = filters.platform;
    }

    if (filters.personaId) {
      where.personaId = filters.personaId;
    }

    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) {
        (where.timestamp as Record<string, unknown>).gte = filters.from;
      }
      if (filters.to) {
        (where.timestamp as Record<string, unknown>).lte = filters.to;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getSessionLogs(sessionId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { agentSessionId: sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
