import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client';

export function registerResources(server: McpServer) {
  // -------------------------------------------------------------------------
  // persona://current - Active persona configuration
  // -------------------------------------------------------------------------
  server.resource(
    'current-persona',
    'persona://current',
    {
      description:
        'The currently active persona configuration including tone, topics, and writing style.',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const result = await api.genericGet('/public/v1/personas/active');
        return {
          contents: [
            {
              uri: 'persona://current',
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch {
        return {
          contents: [
            {
              uri: 'persona://current',
              mimeType: 'application/json',
              text: JSON.stringify({
                message: 'No active persona configured or endpoint not available.',
              }),
            },
          ],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // analytics://dashboard - Current analytics summary
  // -------------------------------------------------------------------------
  server.resource(
    'analytics-dashboard',
    'analytics://dashboard',
    {
      description:
        'Aggregated analytics dashboard showing engagement metrics across all connected platforms.',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const integrations = (await api.listIntegrations()) as Array<{
          id: string;
          name: string;
          identifier: string;
        }>;

        const dashboard: Record<string, unknown> = {
          integrations_count: integrations.length,
          platforms: {},
        };

        for (const integration of integrations) {
          try {
            (dashboard.platforms as Record<string, unknown>)[
              integration.name || integration.id
            ] = await api.getIntegrationAnalytics(integration.id);
          } catch {
            (dashboard.platforms as Record<string, unknown>)[
              integration.name || integration.id
            ] = { error: 'Analytics not available' };
          }
        }

        return {
          contents: [
            {
              uri: 'analytics://dashboard',
              mimeType: 'application/json',
              text: JSON.stringify(dashboard, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: 'analytics://dashboard',
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // compliance://rules/{platform} - Platform-specific posting rules
  // -------------------------------------------------------------------------
  server.resource(
    'compliance-rules',
    'compliance://rules/{platform}',
    {
      description:
        'Platform-specific posting rules, character limits, and content policies. Use the integration ID as the platform parameter.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const platform = uri.pathname.split('/').pop() || '';

      try {
        const result = await api.getIntegrationSettings(platform);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // queue://approvals - Pending approval count
  // -------------------------------------------------------------------------
  server.resource(
    'approval-queue',
    'queue://approvals',
    {
      description:
        'Current count and summary of items pending approval in the review queue.',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const result = await api.getNotifications(0);
        const notifications = result as {
          notifications?: unknown[];
          total?: number;
        };

        return {
          contents: [
            {
              uri: 'queue://approvals',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  pending_count: notifications?.total ?? 0,
                  items: notifications?.notifications ?? [],
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: 'queue://approvals',
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    }
  );
}
