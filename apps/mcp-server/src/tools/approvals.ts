import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerApprovalTools(server: McpServer) {
  server.tool(
    'get_pending_approvals',
    'List items awaiting human review and approval. Returns posts, content, or other items that need to be approved or rejected before they go live.',
    {
      type: z
        .enum(['post', 'content', 'all'])
        .optional()
        .default('all')
        .describe('Filter approvals by type'),
      page: z
        .number()
        .optional()
        .default(0)
        .describe('Page number for pagination'),
    },
    async (params) => {
      try {
        const typeFilter = params.type === 'all' ? '' : `?type=${params.type?.toUpperCase()}`;
        const result = await api.genericGet(`/public/v1/approvals/pending${typeFilter}`);

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
    'approve_item',
    'Approve or reject a pending item. Approved posts will proceed to be published at their scheduled time. Rejected items will be moved back to draft with optional feedback.',
    {
      item_id: z.string().describe('The ID of the item to approve or reject'),
      approved: z
        .boolean()
        .describe('true to approve, false to reject'),
      feedback: z
        .string()
        .optional()
        .describe(
          'Optional feedback message, especially useful when rejecting'
        ),
    },
    async (params) => {
      try {
        const result = await api.genericPost(
          `/public/v1/approvals/${params.item_id}/decide`,
          {
            approved: params.approved,
            feedback: params.feedback,
          }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                result ?? {
                  success: true,
                  item_id: params.item_id,
                  action: params.approved ? 'approved' : 'rejected',
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
}
