export const dynamic = 'force-dynamic';
import { Forgot } from '@mav/frontend/components/auth/forgot';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Forgot Password`,
  description: '',
};
export default async function Auth() {
  return <Forgot />;
}
