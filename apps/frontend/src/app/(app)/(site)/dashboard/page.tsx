export const dynamic = 'force-dynamic';

import { AgentDashboard } from '@maverick/frontend/components/dashboard/agent-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mav - Dashboard',
  description: '',
};

export default async function Index() {
  return <AgentDashboard />;
}
