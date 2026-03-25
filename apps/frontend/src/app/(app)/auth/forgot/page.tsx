export const dynamic = 'force-dynamic';
import { Forgot } from '@maverick/frontend/components/auth/forgot';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Forgot Password`,
  description: '',
};
export default async function Auth() {
  return <Forgot />;
}
