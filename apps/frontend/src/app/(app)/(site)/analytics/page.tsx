export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { PlatformAnalytics } from '@maverick/frontend/components/platform-analytics/platform.analytics';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Maverick' : 'Gitroom'} Analytics`,
  description: '',
};
export default async function Index() {
  return <PlatformAnalytics />;
}
