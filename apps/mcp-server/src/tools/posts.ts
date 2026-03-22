import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerPostTools(server: McpServer) {
  server.tool(
    'create_post',
    'Create and schedule a social media post. Supports multiple platforms, optional scheduling, media attachments, and persona assignment.',
    {
      content: z
        .string()
        .describe('The text content of the post'),
      platforms: z
        .array(z.string())
        .describe(
          'Array of integration IDs to post to. Get available IDs from list_integrations.'
        ),
      schedule_time: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime for when the post should be published. Omit to post immediately.'
        ),
      media_urls: z
        .array(z.string())
        .optional()
        .default([])
        .describe(
          'Array of public URLs for media to attach. Images and videos are supported.'
        ),
      persona_id: z
        .string()
        .optional()
        .describe('Persona ID to use for this post'),
      type: z
        .enum(['now', 'schedule', 'draft'])
        .optional()
        .default('schedule')
        .describe(
          'Post type: "now" to publish immediately, "schedule" to publish at schedule_time, "draft" to save as draft.'
        ),
      settings: z
        .record(z.unknown())
        .optional()
        .describe(
          'Platform-specific settings object. Use get_integration_settings to discover available options.'
        ),
    },
    async (params) => {
      try {
        // Upload media from URLs first
        const mediaIds: string[] = [];
        for (const url of params.media_urls || []) {
          const uploaded = (await api.uploadFromUrl(url)) as {
            id?: string;
            path?: string;
          };
          if (uploaded?.id) {
            mediaIds.push(uploaded.id);
          }
        }

        const body: Record<string, unknown> = {
          posts: params.platforms.map((integrationId) => ({
            content: params.content,
            integration: { id: integrationId },
            settings: params.settings || {},
            media: mediaIds.map((id) => ({ id })),
          })),
          type: params.type,
          ...(params.schedule_time ? { date: params.schedule_time } : {}),
          ...(params.persona_id ? { personaId: params.persona_id } : {}),
        };

        const result = await api.createPost(body);

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
    'list_posts',
    'Query scheduled, published, or draft posts. Filter by status, date range, or platform.',
    {
      status: z
        .enum(['draft', 'scheduled', 'published', 'error'])
        .optional()
        .describe('Filter posts by status'),
      date_from: z
        .string()
        .optional()
        .describe('Start of date range (ISO 8601)'),
      date_to: z
        .string()
        .optional()
        .describe('End of date range (ISO 8601)'),
      platform: z
        .string()
        .optional()
        .describe('Filter by platform/integration identifier'),
    },
    async (params) => {
      try {
        const filters: Record<string, unknown> = {};
        if (params.status) filters.status = params.status;
        if (params.date_from) filters.dateFrom = params.date_from;
        if (params.date_to) filters.dateTo = params.date_to;
        if (params.platform) filters.provider = params.platform;

        const result = await api.listPosts(filters);

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
    'delete_post',
    'Delete a scheduled or draft post by its ID.',
    {
      post_id: z.string().describe('The ID of the post to delete'),
    },
    async (params) => {
      try {
        const result = await api.deletePost(params.post_id);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result ?? { success: true }, null, 2),
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
