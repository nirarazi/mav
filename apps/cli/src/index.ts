import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Argv } from 'yargs';

// Content commands
import { createPost, listPosts, deletePost } from './commands/posts';
import { uploadFile } from './commands/upload';

// Integration commands
import {
  listIntegrations,
  getIntegrationSettings,
  triggerIntegrationTool,
} from './commands/integrations';

// Agent commands
import { brainStatus, brainTrigger } from './commands/brain';
import {
  approvalsList,
  approvalsApprove,
  approvalsReject,
} from './commands/approvals';
import { personasList, personasActive, personasSet } from './commands/personas';
import { complianceAudit, complianceRules } from './commands/compliance';
import { showStatus } from './commands/status';

import { banner } from './ui';

// ---------------------------------------------------------------------------
// Global --json flag
// ---------------------------------------------------------------------------

const cli = yargs(hideBin(process.argv))
  .scriptName('mav')
  .usage('$0 <command> [options]')
  .option('json', {
    global: true,
    describe: 'Output raw JSON (for scripts and agents)',
    type: 'boolean',
    default: false,
  })

  // ─── Status (top-level) ──────────────────────────────────────────────
  .command(
    'status',
    'Show system status dashboard',
    {},
    showStatus as any
  )

  // ─── Content ─────────────────────────────────────────────────────────
  .command(
    'posts:create',
    'Create a new post',
    (yargs: Argv) => {
      return yargs
        .option('content', {
          alias: 'c',
          describe: 'Post/comment content (can be used multiple times)',
          type: 'string',
        })
        .option('media', {
          alias: 'm',
          describe:
            'Comma-separated media URLs for the corresponding -c (can be used multiple times)',
          type: 'string',
        })
        .option('integrations', {
          alias: 'i',
          describe: 'Comma-separated list of integration IDs',
          type: 'string',
        })
        .option('date', {
          alias: 's',
          describe: 'Schedule date (ISO 8601 format) - REQUIRED',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          describe: 'Post type: "schedule" or "draft"',
          type: 'string',
          choices: ['schedule', 'draft'],
          default: 'schedule',
        })
        .option('delay', {
          alias: 'd',
          describe: 'Delay in milliseconds between comments (default: 5000)',
          type: 'number',
          default: 5000,
        })
        .option('jsonFile', {
          alias: 'j',
          describe: 'Path to JSON file with full post structure',
          type: 'string',
        })
        .option('shortLink', {
          describe: 'Use short links',
          type: 'boolean',
          default: true,
        })
        .option('settings', {
          describe: 'Platform-specific settings as JSON string',
          type: 'string',
        })
        .check((argv) => {
          if (!argv.jsonFile && !argv.content) {
            throw new Error('Either --content or --jsonFile is required');
          }
          if (!argv.jsonFile && !argv.integrations) {
            throw new Error(
              '--integrations is required when not using --jsonFile'
            );
          }
          if (!argv.jsonFile && !argv.date) {
            throw new Error('--date is required when not using --jsonFile');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hello World!" -s "2024-12-31T12:00:00Z" -i "twitter-123"',
          'Simple scheduled post'
        );
    },
    createPost as any
  )
  .command(
    'posts:list',
    'List all posts',
    (yargs: Argv) => {
      return yargs
        .option('startDate', {
          describe: 'Start date (ISO 8601). Default: 30 days ago',
          type: 'string',
        })
        .option('endDate', {
          describe: 'End date (ISO 8601). Default: 30 days from now',
          type: 'string',
        })
        .option('customer', {
          describe: 'Customer ID (optional)',
          type: 'string',
        });
    },
    listPosts as any
  )
  .command(
    'posts:delete <id>',
    'Delete a post',
    (yargs: Argv) => {
      return yargs.positional('id', {
        describe: 'Post ID to delete',
        type: 'string',
      });
    },
    deletePost as any
  )
  .command(
    'upload <file>',
    'Upload a file',
    (yargs: Argv) => {
      return yargs.positional('file', {
        describe: 'File path to upload',
        type: 'string',
      });
    },
    uploadFile as any
  )

  // ─── Agent: Brain ────────────────────────────────────────────────────
  .command(
    'brain:status',
    'Show agent brain state and last cycle summary',
    {},
    brainStatus as any
  )
  .command(
    'brain:trigger',
    'Run an OODA strategy cycle',
    (yargs: Argv) => {
      return yargs
        .option('goal', {
          describe: 'Goal to optimize for this cycle',
          type: 'string',
        })
        .option('horizon', {
          describe: 'Time horizon (e.g. "7d", "30d")',
          type: 'string',
        });
    },
    brainTrigger as any
  )

  // ─── Agent: Approvals ────────────────────────────────────────────────
  .command(
    'approvals:list',
    'List pending approval items',
    (yargs: Argv) => {
      return yargs.option('type', {
        describe: 'Filter by type (POST, REPLY, CAMPAIGN)',
        type: 'string',
      });
    },
    approvalsList as any
  )
  .command(
    'approvals:approve <id>',
    'Approve a pending item',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Approval item ID',
          type: 'string',
        })
        .option('feedback', {
          alias: 'f',
          describe: 'Optional feedback',
          type: 'string',
        });
    },
    approvalsApprove as any
  )
  .command(
    'approvals:reject <id>',
    'Reject a pending item',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Approval item ID',
          type: 'string',
        })
        .option('feedback', {
          alias: 'f',
          describe: 'Reason for rejection (required)',
          type: 'string',
          demandOption: true,
        });
    },
    approvalsReject as any
  )

  // ─── Agent: Personas ─────────────────────────────────────────────────
  .command(
    'personas:list',
    'List all personas',
    {},
    personasList as any
  )
  .command(
    'personas:active',
    'Show the currently active persona',
    {},
    personasActive as any
  )
  .command(
    'personas:set <id>',
    'Switch the active persona',
    (yargs: Argv) => {
      return yargs.positional('id', {
        describe: 'Persona ID to activate',
        type: 'string',
      });
    },
    personasSet as any
  )

  // ─── Agent: Compliance ───────────────────────────────────────────────
  .command(
    'compliance:audit',
    'Show the compliance audit trail',
    (yargs: Argv) => {
      return yargs
        .option('from', {
          describe: 'Start date (ISO 8601)',
          type: 'string',
        })
        .option('to', {
          describe: 'End date (ISO 8601)',
          type: 'string',
        });
    },
    complianceAudit as any
  )
  .command(
    'compliance:rules <id>',
    'Show platform-specific posting rules',
    (yargs: Argv) => {
      return yargs.positional('id', {
        describe: 'Integration ID',
        type: 'string',
      });
    },
    complianceRules as any
  )

  // ─── Integrations ────────────────────────────────────────────────────
  .command(
    'integrations:list',
    'List all connected integrations',
    {},
    listIntegrations as any
  )
  .command(
    'integrations:settings <id>',
    'Get settings schema for an integration',
    (yargs: Argv) => {
      return yargs.positional('id', {
        describe: 'Integration ID',
        type: 'string',
      });
    },
    getIntegrationSettings as any
  )
  .command(
    'integrations:trigger <id> <method>',
    'Trigger an integration tool',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('method', {
          describe: 'Method name from the integration tools',
          type: 'string',
        })
        .option('data', {
          alias: 'd',
          describe: 'Data to pass to the tool as JSON string',
          type: 'string',
        });
    },
    triggerIntegrationTool as any
  )

  // ─── Global config ───────────────────────────────────────────────────
  .demandCommand(1, 'You need at least one command')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue(
    'Set your API key: export MAVERICK_API_KEY=your_api_key\n' +
      'Docs: https://mav.social  |  SKILL.md for agent integration'
  )
  .wrap(Math.min(100, process.stdout.columns || 80));

// Show banner unless --json flag or --help
const argv = process.argv.slice(2);
const isJson = argv.includes('--json');
const isHelp = argv.includes('--help') || argv.includes('-h');

if (!isJson && !isHelp) {
  banner();
}

cli.parse();
