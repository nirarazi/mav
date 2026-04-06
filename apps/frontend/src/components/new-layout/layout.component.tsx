'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@mav/frontend/components/new-layout/logo';
import { DM_Sans } from 'next/font/google';
const ModeComponent = dynamic(
  () => import('@mav/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@mav/helpers/utils/custom.fetch';
import { useVariables } from '@mav/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@mav/frontend/components/layout/check.payment';
import { ToolTip } from '@mav/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@mav/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@mav/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@mav/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@mav/react/toaster/toaster';
import { ShowPostSelector } from '@mav/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@mav/frontend/components/layout/new.subscription';
import { Support } from '@mav/frontend/components/layout/support';
import { ContinueProvider } from '@mav/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@mav/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@mav/react/helpers/mantine.wrapper';
import { Impersonate } from '@mav/frontend/components/layout/impersonate';
import { Title } from '@mav/frontend/components/layout/title';
import { TopMenu } from '@mav/frontend/components/layout/top.menu';
import { LanguageComponent } from '@mav/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@mav/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@mav/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@mav/frontend/components/layout/organization.selector';
import { StreakComponent } from '@mav/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@mav/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@mav/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@mav/frontend/components/billing/first.billing.component';
import { AgentStatusBar } from '@mav/frontend/components/layout/agent-status-bar';

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div
              className={clsx(
                'flex flex-col min-h-screen min-w-screen text-newTextColor',
                dmSans.className
              )}
            >
              <AgentStatusBar />
              <div className="flex-1 flex flex-col p-[12px]">
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <div className="flex-1 flex gap-[8px]">
                  <Support />
                  <div className="flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                    <div
                      className={clsx(
                        'fixed h-[calc(100%-60px)] w-[64px] start-[17px] flex flex-1 top-[48px]',
                        user?.admin && 'pt-[60px] max-h-[1000px]:w-[500px]'
                      )}
                    >
                      <div className="flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                        <Logo />
                        <TopMenu />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                    <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center">
                      <div className="text-[24px] font-[600] flex flex-1">
                        <Title />
                      </div>
                      <div className="flex gap-[20px] items-center text-textItemBlur">
                        <OrganizationSelector />
                        <div className="w-[1px] h-[20px] bg-blockSeparator" />
                        <NotificationComponent />
                      </div>
                    </div>
                    <div className="flex flex-1 gap-[1px]">{children}</div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
