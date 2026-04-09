export const dynamic = 'force-dynamic';

import { EngagementQueue } from '@mav/frontend/components/engagements/engagement-queue';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mav - Engagements',
  description: '',
};

export default async function Index() {
  return <EngagementQueue />;
}
