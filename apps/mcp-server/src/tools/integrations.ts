import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerIntegrationTools(server: McpServer) {
  server.tool(
    'list_integrations',
    'List all connected social media accounts/channels. Returns integration IDs, platform names, profile info, and connection status. Use the returned IDs when creating posts.',
    {},
    async () => {
      try {
        const result = await api.listIntegrations();

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
    'get_integration_settings',
    'Get platform-specific constraints and settings for a connected integration. Returns max character length, available settings schema, posting rules, and platform-specific tools. Call this before creating a post to understand what each platform supports.',
    {
      integration_id: z
        .string()
        .describe(
          'The integration ID to get settings for. Get this from list_integrations.'
        ),
    },
    async (params) => {
      try {
        const result = await api.getIntegrationSettings(
          params.integration_id
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
