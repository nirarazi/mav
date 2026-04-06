import { Plugs } from '@mav/frontend/components/plugs/plugs';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Plugs`,
  description: '',
};
export default async function Index() {
  return <Plugs />;
}
