import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerEngagementTools(server: McpServer) {
  server.tool(
    'get_engagement_queue',
    'List pending engagements that need responses. Filter by platform, tier, or status.',
    {
      platform: z.string().optional().describe('Filter by platform (x, linkedin, bluesky, etc.)'),
      status: z.enum(['PENDING', 'RESPONDED', 'SKIPPED', 'ESCALATED']).optional(),
      tier: z.number().min(1).max(5).optional().describe('Engagement tier: 1=passive, 2=acknowledgment, 3=conversational, 4=proactive, 5=sensitive'),
      take: z.number().optional().default(20),
    },
    async (params) => {
      try {
        const query = new URLSearchParams();
        if (params.platform) query.append('platform', params.platform);
        if (params.status) query.append('status', params.status);
        if (params.tier) query.append('tier', params.tier.toString());
        query.append('take', params.take.toString());

        const result = await api.genericGet(`/public/v1/engagements?${query.toString()}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_missed_engagements',
    'List engagements that were skipped due to low confidence. These can be used to teach the agent better responses.',
    {},
    async () => {
      try {
        const result = await api.genericGet('/public/v1/engagements/missed');
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'teach_engagement',
    'Teach the agent how to respond to a missed engagement by providing an ideal response. This adds the example to the persona\'s engagement examples.',
    {
      engagement_id: z.string().describe('The ID of the missed engagement'),
      ideal_response: z.string().describe('The ideal response the agent should have given'),
    },
    async (params) => {
      try {
        const result = await api.genericPost(
          `/public/v1/engagements/${params.engagement_id}/teach`,
          { idealResponse: params.ideal_response }
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_autonomy_status',
    'View the trust graduation status for each platform and engagement tier. Shows whether the agent is supervised, graduating, or autonomous.',
    {},
    async () => {
      try {
        const result = await api.genericGet('/public/v1/engagements/autonomy');
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'override_autonomy',
    'Manually promote or demote a tier+platform combination. Use to force autonomous mode or reset to supervised.',
    {
      platform: z.string().describe('Platform name (x, linkedin, bluesky, etc.)'),
      tier: z.number().min(1).max(5).describe('Engagement tier (1-5)'),
      status: z.enum(['SUPERVISED', 'AUTONOMOUS']).describe('New autonomy status'),
    },
    async (params) => {
      try {
        const result = await api.genericPut('/public/v1/engagements/autonomy', {
          platform: params.platform,
          tier: params.tier,
          status: params.status,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
