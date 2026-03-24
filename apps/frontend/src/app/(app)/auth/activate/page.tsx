export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@maverick/frontend/components/auth/activate';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'Mav' : 'Gitroom'
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <Activate />;
}
