export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { PlatformAnalytics } from '@mav/frontend/components/platform-analytics/platform.analytics';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Analytics`,
  description: '',
};
export default async function Index() {
  return <PlatformAnalytics />;
}
