export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { AfterActivate } from '@mav/frontend/components/auth/after.activate';
import { isGeneralServerSide } from '@mav/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'Mav' : 'Mav'
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <AfterActivate />;
}
