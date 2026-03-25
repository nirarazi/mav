import { getPendingApprovals, decideApproval } from '../api';
import { spinner, table, success, error, warn, truncate } from '../ui';

export async function approvalsList(args: any) {
  const s = spinner('Fetching pending approvals...');
  s.start();

  try {
    const result = (await getPendingApprovals(args.type)) as any;
    s.stop();

    const items = Array.isArray(result) ? result : result?.items || [];

    if (args.json) {
      console.log(JSON.stringify(items));
      return;
    }

    if (items.length === 0) {
      success('No pending approvals — your queue is clear');
      return;
    }

    table(
      ['ID', 'Type', 'Content', 'Risk', 'Submitted'],
      items.map((item: any) => [
        item.id?.slice(0, 8) || '-',
        item.type || '-',
        truncate(
          item.payload?.content || item.payload?.text || 'N/A',
          50
        ),
        item.riskScore?.toFixed(2) || '-',
        item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : '-',
      ])
    );

    warn(`${items.length} item(s) awaiting review`);
  } catch (err: any) {
    s.stop();
    error(`Failed to fetch approvals: ${err.message}`);
    process.exit(1);
  }
}

export async function approvalsApprove(args: any) {
  if (!args.id) {
    error('Approval item ID is required');
    process.exit(1);
  }

  const s = spinner(`Approving ${args.id}...`);
  s.start();

  try {
    await decideApproval(args.id, true, args.feedback);
    s.stop();

    if (args.json) {
      console.log(JSON.stringify({ id: args.id, status: 'approved' }));
      return;
    }

    success(`Approved: ${args.id}`);
  } catch (err: any) {
    s.stop();
    error(`Failed to approve: ${err.message}`);
    process.exit(1);
  }
}

export async function approvalsReject(args: any) {
  if (!args.id) {
    error('Approval item ID is required');
    process.exit(1);
  }

  if (!args.feedback) {
    error('Feedback is required when rejecting (--feedback "reason")');
    process.exit(1);
  }

  const s = spinner(`Rejecting ${args.id}...`);
  s.start();

  try {
    await decideApproval(args.id, false, args.feedback);
    s.stop();

    if (args.json) {
      console.log(
        JSON.stringify({
          id: args.id,
          status: 'rejected',
          feedback: args.feedback,
        })
      );
      return;
    }

    success(`Rejected: ${args.id}`);
  } catch (err: any) {
    s.stop();
    error(`Failed to reject: ${err.message}`);
    process.exit(1);
  }
}
