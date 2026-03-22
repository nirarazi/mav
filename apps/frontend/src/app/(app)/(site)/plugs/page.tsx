import { Plugs } from '@maverick/frontend/components/plugs/plugs';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Maverick' : 'Gitroom'} Plugs`,
  description: '',
};
export default async function Index() {
  return <Plugs />;
}
