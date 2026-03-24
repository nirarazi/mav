export const dynamic = 'force-dynamic';
import { Login } from '@maverick/frontend/components/auth/login';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mav' : 'Gitroom'} Login`,
  description: '',
};
export default async function Auth() {
  return <Login />;
}
