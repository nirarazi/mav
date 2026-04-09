import { proxyActivities, sleep } from '@temporalio/workflow';
import type { EngagementActivity } from '@mav/orchestrator/activities/engagement.activity';

const { pollEngagements, processEngagementCycle } = proxyActivities<EngagementActivity>({
  startToCloseTimeout: '5 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '1 minute',
  },
});

export async function engagementWorkflow({
  orgId,
  intervalMs = 15 * 60 * 1000,
  immediately = false,
}: {
  orgId: string;
  intervalMs?: number;
  immediately?: boolean;
}) {
  while (true) {
    if (immediately) {
      try {
        await pollEngagements(orgId);
        await processEngagementCycle(orgId);
      } catch (err) {
        // Log and continue — will retry next cycle
      }
    }
    immediately = true;
    await sleep(intervalMs);
  }
}

export async function engagementOneShotWorkflow({ orgId }: { orgId: string }) {
  await pollEngagements(orgId);
  return processEngagementCycle(orgId);
}
