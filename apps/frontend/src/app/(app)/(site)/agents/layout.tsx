import { Metadata } from 'next';
import { Agent } from '@mav/frontend/components/agents/agent';
export const metadata: Metadata = {
  title: 'Mav - Agent',
  description: 'agents',
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Agent>{children}</Agent>;
}
