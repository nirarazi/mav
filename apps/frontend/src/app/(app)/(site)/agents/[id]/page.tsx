import { Metadata } from 'next';
import { Agent } from '@maverick/frontend/components/agents/agent';
import { AgentChat } from '@maverick/frontend/components/agents/agent.chat';
export const metadata: Metadata = {
  title: 'Maverick - Agent',
  description: '',
};
export default async function Page() {
  return (
    <AgentChat />
  );
}
