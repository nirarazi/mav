import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerBrainTools(server: McpServer) {
  server.tool(
    'run_strategy_cycle',
    'Trigger the Maverick agent brain to run a strategy cycle. The brain analyzes current performance, generates content ideas, and queues posts based on the given goal and time horizon.',
    {
      goal: z
        .string()
        .optional()
        .describe(
          'Strategic goal for this cycle, e.g. "increase engagement on Twitter by 20%" or "grow LinkedIn followers"'
        ),
      time_horizon: z
        .enum(['day', 'week', 'month', 'quarter'])
        .optional()
        .default('week')
        .describe('Planning horizon for the strategy cycle'),
    },
    async (params) => {
      try {
        const result = await api.genericPost('/public/v1/brain/strategy', {
          goal: params.goal,
          timeHorizon: params.time_horizon,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_compliance_report',
    'Get an audit trail of agent actions and compliance status. Shows what the agent brain did, which posts were created, approved, or rejected, and any policy violations.',
    {
      date_range: z
        .object({
          from: z.string().describe('Start date (ISO 8601)'),
          to: z.string().describe('End date (ISO 8601)'),
        })
        .describe('Date range for the compliance report'),
    },
    async (params) => {
      try {
        const result = await api.genericGet(
          `/public/v1/brain/compliance?from=${encodeURIComponent(params.date_range.from)}&to=${encodeURIComponent(params.date_range.to)}`
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
