import { Metadata } from 'next';
import { Agent } from '@maverick/frontend/components/agents/agent';
export const metadata: Metadata = {
  title: 'Maverick - Agent',
  description: 'agents',
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Agent>{children}</Agent>;
}
