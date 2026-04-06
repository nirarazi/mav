import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerPostTools } from './tools/posts';
import { registerIntegrationTools } from './tools/integrations';
import { registerApprovalTools } from './tools/approvals';
import { registerPersonaTools } from './tools/personas';
import { registerAnalyticsTools } from './tools/analytics';
import { registerBrainTools } from './tools/brain';
import { registerResources } from './resources';

const server = new McpServer({
  name: 'mav',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register all tools
registerPostTools(server);
registerIntegrationTools(server);
registerApprovalTools(server);
registerPersonaTools(server);
registerAnalyticsTools(server);
registerBrainTools(server);

// Register all resources
registerResources(server);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start Mav MCP server:', error);
  process.exit(1);
});
