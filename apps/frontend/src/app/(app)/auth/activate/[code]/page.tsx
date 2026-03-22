export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { AfterActivate } from '@maverick/frontend/components/auth/after.activate';
import { isGeneralServerSide } from '@maverick/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'Maverick' : 'Gitroom'
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <AfterActivate />;
}
