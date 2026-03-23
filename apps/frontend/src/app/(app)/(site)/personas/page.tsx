export const dynamic = 'force-dynamic';

import { PersonaWizard } from '@maverick/frontend/components/personas/persona-wizard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maverick - Personas',
  description: '',
};

export default async function Index() {
  return <PersonaWizard />;
}
