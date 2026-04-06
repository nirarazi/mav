import { Metadata } from 'next';
import { Agent } from '@mav/frontend/components/agents/agent';
import { AgentChat } from '@mav/frontend/components/agents/agent.chat';
export const metadata: Metadata = {
  title: 'Mav - Agent',
  description: '',
};
export default async function Page() {
  return (
    <AgentChat />
  );
}
