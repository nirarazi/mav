import { proxyActivities, sleep } from '@temporalio/workflow';

// Activities are proxied — they run in the worker process, not the workflow sandbox
const { runBrainCycle, logWorkflowEvent } = proxyActivities<{
  runBrainCycle: (orgId: string, trigger: string) => Promise<{
    sessionId: string;
    actionsCount: number;
    durationMs: number;
    cost: number;
  }>;
  logWorkflowEvent: (orgId: string, event: string, data: unknown) => Promise<void>;
}>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '30 seconds',
    backoffCoefficient: 2,
  },
});

/**
 * Temporal workflow: Runs a daily OODA brain cycle for an organization.
 *
 * This workflow is designed to be scheduled via Temporal's cron feature
 * or triggered on-demand via signal.
 *
 * Example scheduling:
 *   client.workflow.start(brainCycleWorkflow, {
 *     taskQueue: 'maverick-brain',
 *     workflowId: `brain-cycle-${orgId}`,
 *     args: [orgId],
 *     cronSchedule: '0 9 * * *', // Daily at 9am
 *   })
 */
export async function brainCycleWorkflow(orgId: string): Promise<void> {
  await logWorkflowEvent(orgId, 'BRAIN_CYCLE_START', {
    trigger: 'cron',
    timestamp: new Date().toISOString(),
  });

  const result = await runBrainCycle(orgId, 'cron');

  await logWorkflowEvent(orgId, 'BRAIN_CYCLE_COMPLETE', {
    sessionId: result.sessionId,
    actionsCount: result.actionsCount,
    durationMs: result.durationMs,
    cost: result.cost,
  });
}

/**
 * Temporal workflow: Continuous brain loop with configurable interval.
 *
 * For organizations that want more frequent autonomous cycles.
 * Runs the brain cycle, then sleeps for the configured interval.
 * Designed to run as a long-lived workflow.
 */
export async function continuousBrainWorkflow(
  orgId: string,
  intervalMinutes: number = 60,
): Promise<void> {
  while (true) {
    try {
      await runBrainCycle(orgId, 'continuous');
    } catch (err) {
      await logWorkflowEvent(orgId, 'BRAIN_CYCLE_ERROR', {
        error: String(err),
      });
    }

    // Sleep for the configured interval before next cycle
    await sleep(`${intervalMinutes} minutes`);
  }
}
