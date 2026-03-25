import { listPersonas, getActivePersona, setActivePersona } from '../api';
import { spinner, table, statusBox, success, error } from '../ui';

export async function personasList(args: any) {
  const s = spinner('Fetching personas...');
  s.start();

  try {
    const result = (await listPersonas()) as any;
    s.stop();

    const items = Array.isArray(result) ? result : result?.items || [];

    if (args.json) {
      console.log(JSON.stringify(items));
      return;
    }

    if (items.length === 0) {
      error('No personas configured — create one in the web UI or via MCP');
      return;
    }

    table(
      ['ID', 'Name', 'Role', 'Tone', 'Active'],
      items.map((p: any) => [
        p.id?.slice(0, 8) || '-',
        p.name || '-',
        p.role || '-',
        Array.isArray(p.tone) ? p.tone.join(', ') : p.tone || '-',
        p.isActive ? '\u2713' : '',
      ])
    );
  } catch (err: any) {
    s.stop();
    error(`Failed to fetch personas: ${err.message}`);
    process.exit(1);
  }
}

export async function personasActive(args: any) {
  const s = spinner('Fetching active persona...');
  s.start();

  try {
    const result = (await getActivePersona()) as any;
    s.stop();

    if (args.json) {
      console.log(JSON.stringify(result));
      return;
    }

    if (!result || !result.name) {
      error('No active persona configured');
      return;
    }

    statusBox('Active Persona', {
      Name: result.name,
      Role: result.role || '-',
      Tone: Array.isArray(result.tone) ? result.tone.join(', ') : result.tone || '-',
      Topics: Array.isArray(result.topics) ? result.topics.join(', ') : result.topics || '-',
    });
  } catch (err: any) {
    s.stop();
    error(`Failed to fetch persona: ${err.message}`);
    process.exit(1);
  }
}

export async function personasSet(args: any) {
  if (!args.id) {
    error('Persona ID is required');
    process.exit(1);
  }

  const s = spinner(`Setting active persona to ${args.id}...`);
  s.start();

  try {
    await setActivePersona(args.id);
    s.stop();

    if (args.json) {
      console.log(JSON.stringify({ personaId: args.id, status: 'active' }));
      return;
    }

    success(`Active persona set to: ${args.id}`);
  } catch (err: any) {
    s.stop();
    error(`Failed to set persona: ${err.message}`);
    process.exit(1);
  }
}
