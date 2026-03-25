import { triggerBrain, getBrainStatus } from '../api';
import { spinner, statusBox, success, error, table } from '../ui';

export async function brainStatus(args: any) {
  const s = spinner('Fetching brain status...');
  s.start();

  try {
    const result = (await getBrainStatus()) as any;
    s.stop();

    if (args.json) {
      console.log(JSON.stringify(result));
      return;
    }

    statusBox('Agent Brain', {
      State: result?.state || 'Idle',
      'Active Persona': result?.persona || 'None',
      'Last Cycle': result?.lastCycle?.timestamp
        ? new Date(result.lastCycle.timestamp).toLocaleString()
        : 'Never',
      'Total Cycles': String(result?.totalCycles || 0),
      'Total Cost': result?.totalCost
        ? `$${result.totalCost.toFixed(4)}`
        : '$0',
    });

    if (result?.recentActions?.length > 0) {
      table(
        ['Time', 'Action', 'Platform', 'Status'],
        result.recentActions.map((a: any) => [
          new Date(a.timestamp).toLocaleTimeString(),
          a.action,
          a.platform || '-',
          a.status,
        ])
      );
    }
  } catch (err: any) {
    s.stop();
    error(`Failed to get brain status: ${err.message}`);
    process.exit(1);
  }
}

export async function brainTrigger(args: any) {
  const s = spinner('Running OODA strategy cycle...');
  s.start();

  try {
    const result = (await triggerBrain(args.goal, args.horizon)) as any;
    s.stop();

    if (args.json) {
      console.log(JSON.stringify(result));
      return;
    }

    success('Strategy cycle complete');

    statusBox('Cycle Results', {
      'Actions Taken': String(result?.actionsCount || 0),
      'Posts Drafted': String(result?.postsDrafted || 0),
      'Posts Queued': String(result?.postsQueued || 0),
      Cost: result?.cost ? `$${result.cost.toFixed(4)}` : '$0',
    });

    if (result?.decisions?.length > 0) {
      table(
        ['Platform', 'Topic', 'Risk', 'Action'],
        result.decisions.map((d: any) => [
          d.platform,
          d.topic,
          d.riskScore?.toFixed(2) || '-',
          d.action,
        ])
      );
    }
  } catch (err: any) {
    s.stop();
    error(`Brain cycle failed: ${err.message}`);
    process.exit(1);
  }
}
