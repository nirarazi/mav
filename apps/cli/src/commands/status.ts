import {
  checkConnection,
  getBrainStatus,
  getPendingApprovals,
  getActivePersona,
} from '../api';
import { statusBox, error, purple, dim, green, red, yellow } from '../ui';

export async function showStatus(args: any) {

  const results = await Promise.allSettled([
    checkConnection(),
    getBrainStatus(),
    getPendingApprovals(),
    getActivePersona(),
  ]);

  const [connResult, brainResult, approvalsResult, personaResult] = results;

  if (args.json) {
    console.log(
      JSON.stringify({
        connected: connResult.status === 'fulfilled',
        brain: brainResult.status === 'fulfilled' ? brainResult.value : null,
        pendingApprovals:
          approvalsResult.status === 'fulfilled'
            ? approvalsResult.value
            : null,
        persona:
          personaResult.status === 'fulfilled' ? personaResult.value : null,
      })
    );
    return;
  }

  const connected = connResult.status === 'fulfilled';

  const brain =
    brainResult.status === 'fulfilled'
      ? (brainResult.value as any)
      : null;

  const approvals =
    approvalsResult.status === 'fulfilled'
      ? (approvalsResult.value as any)
      : null;

  const persona =
    personaResult.status === 'fulfilled'
      ? (personaResult.value as any)
      : null;

  const pendingCount = Array.isArray(approvals) ? approvals.length : 0;

  statusBox('System', {
    Connection: connected ? green('Connected') : red('Disconnected'),
    'Agent Brain': brain?.state
      ? brain.state === 'RUNNING'
        ? green('Running')
        : yellow(brain.state)
      : dim('Idle'),
    'Active Persona': persona?.name || dim('None configured'),
    'Pending Approvals':
      pendingCount > 0 ? yellow(String(pendingCount)) : green('0'),
  });

  if (brain?.lastCycle) {
    statusBox('Last Brain Cycle', {
      'Ran at': new Date(brain.lastCycle.timestamp).toLocaleString(),
      Actions: String(brain.lastCycle.actionsCount || 0),
      Cost: brain.lastCycle.cost ? `$${brain.lastCycle.cost.toFixed(4)}` : '$0',
    });
  }
}
