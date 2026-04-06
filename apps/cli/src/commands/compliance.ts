import { getComplianceAudit } from '../api';
import { MavAPI } from '../api';
import { getConfig } from '../config';
import { spinner, table, statusBox, error } from '../ui';

export async function complianceAudit(args: any) {
  const s = spinner('Fetching audit trail...');
  s.start();

  try {
    const result = (await getComplianceAudit(args.from, args.to)) as any;
    s.stop();

    const items = Array.isArray(result) ? result : result?.items || [];

    if (args.json) {
      console.log(JSON.stringify(items));
      return;
    }

    if (items.length === 0) {
      statusBox('Audit Trail', { Status: 'No audit entries in the given range' });
      return;
    }

    table(
      ['Time', 'Action', 'Platform', 'Risk', 'Cost'],
      items.map((entry: any) => [
        entry.timestamp
          ? new Date(entry.timestamp).toLocaleString()
          : '-',
        entry.action || '-',
        entry.platform || '-',
        entry.riskScore?.toFixed(2) || '-',
        entry.llmCost ? `$${entry.llmCost.toFixed(4)}` : '-',
      ])
    );
  } catch (err: any) {
    s.stop();
    error(`Failed to fetch audit trail: ${err.message}`);
    process.exit(1);
  }
}

export async function complianceRules(args: any) {
  if (!args.id) {
    error('Integration ID is required');
    process.exit(1);
  }

  const config = getConfig();
  const api = new MavAPI(config);

  const s = spinner(`Fetching rules for ${args.id}...`);
  s.start();

  try {
    const result = (await api.getIntegrationSettings(args.id)) as any;
    s.stop();

    if (args.json) {
      console.log(JSON.stringify(result));
      return;
    }

    statusBox(`Platform Rules: ${result?.name || args.id}`, {
      'Max Characters': String(result?.maxCharacters || 'N/A'),
      'Media Types': result?.supportedMediaTypes?.join(', ') || 'N/A',
      'Rate Limit': result?.rateLimit || 'N/A',
      'Bot Label Required': result?.botLabelRequired ? 'Yes' : 'No',
    });
  } catch (err: any) {
    s.stop();
    error(`Failed to fetch rules: ${err.message}`);
    process.exit(1);
  }
}
