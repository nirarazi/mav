export const dynamic = 'force-dynamic';
import { Login } from '@mav/frontend/components/auth/login';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Mav'} Login`,
  description: '',
};
export default async function Auth() {
  return <Login />;
}
