export const dynamic = 'force-dynamic';

import { ApprovalQueue } from '@maverick/frontend/components/approvals/approval-queue';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mav - Approvals',
  description: '',
};

export default async function Index() {
  return <ApprovalQueue />;
}
