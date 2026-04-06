import { proxyActivities, sleep } from '@temporalio/workflow';
import type { BrainActivity } from '@mav/orchestrator/activities/brain.activity';

const { runOodaCycle, getActiveOrganizations } = proxyActivities<BrainActivity>({
  startToCloseTimeout: '5 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '1 minute',
  },
});

/**
 * Brain Workflow — Scheduled Temporal workflow that runs the OODA cycle.
 *
 * This workflow runs continuously, waking up every `intervalMs` to:
 * 1. Find all organizations with autonomous posting enabled
 * 2. Run an OODA cycle for each org
 * 3. Sleep until the next cycle
 *
 * Default interval: 6 hours (4x/day)
 */
export async function brainWorkflow({
  orgId,
  intervalMs = 6 * 60 * 60 * 1000, // 6 hours
  immediately = false,
}: {
  orgId?: string;
  intervalMs?: number;
  immediately?: boolean;
}) {
  while (true) {
    if (immediately) {
      try {
        if (orgId) {
          // Single-org mode: run for specific org
          await runOodaCycle(orgId);
        } else {
          // Multi-org mode: run for all active orgs
          const orgIds = await getActiveOrganizations();
          for (const id of orgIds) {
            try {
              await runOodaCycle(id);
            } catch (err) {
              // Log but continue with other orgs
            }
          }
        }
      } catch (err) {
        // Will retry on next cycle
      }
    }
    immediately = true;
    await sleep(intervalMs);
  }
}

/**
 * One-shot brain cycle — run a single OODA cycle for an org, then exit.
 * Used for manual triggers (MCP tool call, API request, etc.)
 */
export async function brainOneShotWorkflow({ orgId }: { orgId: string }) {
  return runOodaCycle(orgId);
}
