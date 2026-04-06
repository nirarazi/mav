'use client';

import { FC, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModals } from '@mav/frontend/components/layout/new-modal';
import { useT } from '@mav/react/translation/get.transation.service.client';
import { OnboardingModal } from '@mav/frontend/components/onboarding/onboarding.modal';

export const Onboarding: FC = () => {
  const query = useSearchParams();
  const modal = useModals();
  const router = useRouter();
  const modalOpen = useRef(false);
  const t = useT();

  const handleClose = useCallback(() => {
    modal.closeAll();
    router.push('/dashboard');
  }, [modal, router]);

  useEffect(() => {
    const onboarding = query.get('onboarding');
    if (!onboarding) {
      if (modalOpen.current) {
        modalOpen.current = false;
        modal.closeAll();
      }
      return;
    }
    if (modalOpen.current) {
      return;
    }
    modalOpen.current = true;
    modal.openModal({
      // title: t('onboarding', 'Welcome to Mav'),
      withCloseButton: true,
      closeOnEscape: false,
      removeLayout: true,
      askClose: true,
      fullScreen: true,
      onClose: handleClose,
      children: <OnboardingModal onClose={handleClose} />,
    });
  }, [query, handleClose, t]);
  
  return null;
};
