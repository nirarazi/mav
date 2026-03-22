import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    'get_analytics',
    'Get engagement metrics and performance data. Can retrieve analytics for a specific platform integration, a specific post, or a date range.',
    {
      platform: z
        .string()
        .optional()
        .describe(
          'Integration ID to get analytics for. Get IDs from list_integrations.'
        ),
      date_range: z
        .string()
        .optional()
        .describe(
          'Date string for the analytics period (format depends on the platform)'
        ),
      post_id: z
        .string()
        .optional()
        .describe('Specific post ID to get analytics for'),
    },
    async (params) => {
      try {
        let result: unknown;

        if (params.post_id) {
          result = await api.getPostAnalytics(
            params.post_id,
            params.date_range
          );
        } else if (params.platform) {
          result = await api.getIntegrationAnalytics(
            params.platform,
            params.date_range
          );
        } else {
          // If no specific filter, try to get all integrations and fetch analytics for each
          const integrations = (await api.listIntegrations()) as Array<{
            id: string;
            name: string;
            identifier: string;
          }>;

          const allAnalytics: Record<string, unknown> = {};
          for (const integration of integrations) {
            try {
              allAnalytics[integration.name || integration.id] =
                await api.getIntegrationAnalytics(
                  integration.id,
                  params.date_range
                );
            } catch {
              allAnalytics[integration.name || integration.id] = {
                error: 'Analytics not available for this integration',
              };
            }
          }
          result = allAnalytics;
        }

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
    'get_brand_sentiment',
    'Get current brand sentiment analysis across social platforms. Shows how your audience perceives your brand based on engagement patterns and interactions.',
    {
      platform: z
        .string()
        .optional()
        .describe('Integration ID to analyze sentiment for'),
      timeframe: z
        .enum(['day', 'week', 'month', 'quarter'])
        .optional()
        .default('week')
        .describe('Time period for sentiment analysis'),
    },
    async (params) => {
      try {
        const result = await api.genericGet(
          `/public/v1/sentiment?${new URLSearchParams({
            ...(params.platform ? { platform: params.platform } : {}),
            timeframe: params.timeframe || 'week',
          }).toString()}`
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
