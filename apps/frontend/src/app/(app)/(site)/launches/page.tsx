export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@maverick/frontend/components/launches/launches.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav Calendar' : 'Mav Calendar'}`,
  description: '',
};
export default async function Index() {
  return <LaunchesComponent />;
}
