import { MediaLayoutComponent } from '@mav/frontend/components/new-layout/layout.media.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Media`,
  description: '',
};

export default async function Page() {
  return <MediaLayoutComponent />
}
