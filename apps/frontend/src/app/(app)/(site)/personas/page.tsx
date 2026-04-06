export const dynamic = 'force-dynamic';

import { PersonaWizard } from '@mav/frontend/components/personas/persona-wizard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mav - Personas',
  description: '',
};

export default async function Index() {
  return <PersonaWizard />;
}
