import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerPersonaTools(server: McpServer) {
  server.tool(
    'set_persona',
    'Switch the active persona for content generation. A persona defines the voice, tone, and style used when creating posts.',
    {
      persona_id: z
        .string()
        .describe('The ID of the persona to activate'),
    },
    async (params) => {
      try {
        const result = await api.genericPost('/public/v1/personas/active', {
          personaId: params.persona_id,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                result ?? {
                  success: true,
                  active_persona: params.persona_id,
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
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'create_persona',
    'Define a new persona for content generation. A persona controls the voice, tone, topics, and writing style for posts.',
    {
      name: z.string().describe('Display name for the persona'),
      tone: z
        .array(z.string())
        .describe(
          'Array of tone descriptors, e.g. ["professional", "witty", "casual"]'
        ),
      topics: z
        .array(z.string())
        .describe(
          'Array of topics this persona focuses on, e.g. ["AI", "startups", "dev tools"]'
        ),
      writing_style: z
        .string()
        .optional()
        .describe(
          'Free-form description of writing style, e.g. "Short punchy sentences. Uses analogies. Avoids jargon."'
        ),
    },
    async (params) => {
      try {
        const result = await api.genericPost('/public/v1/personas', {
          name: params.name,
          tone: params.tone,
          topics: params.topics,
          writingStyle: params.writing_style,
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
}
