'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@mav/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CustomVariables } from '@mav/frontend/components/launches/add.provider.component';
import { useT } from '@mav/react/translation/get.transation.service.client';
import { useModals } from '@mav/frontend/components/layout/new-modal';
import { useVariables } from '@mav/react/helpers/variable.context';
import { useToaster } from '@mav/react/toaster/toaster';

interface OnboardingModalProps {
  onClose: () => void;
}

const steps = [
  { label: 'Welcome', icon: '👋' },
  { label: 'Connect', icon: '🔗' },
  { label: 'Ready', icon: '🚀' },
];

export const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const modals = useModals();

  return (
    <div className="w-full min-h-full flex-1 p-4 sm:p-8 flex relative">
      <style>{`#support-discord {display: none}`}</style>
      <div className="flex flex-1 bg-[#FAFAF8] rounded-2xl flex-col relative overflow-hidden">
        {/* Close button */}
        <button
          className="absolute end-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E8E6E1] transition-colors cursor-pointer text-[#6B6B6B] hover:text-[#1A1A1A]"
          type="button"
          onClick={modals.closeAll}
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Step progress bar */}
        <div className="flex items-center justify-center gap-3 pt-8 pb-2 px-8">
          {steps.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <React.Fragment key={s.label}>
                {i > 0 && (
                  <div
                    className={clsx(
                      'h-[2px] w-10 rounded-full transition-colors',
                      isDone ? 'bg-[#7C5CFC]' : 'bg-[#E8E6E1]'
                    )}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-[#7C5CFC] text-white'
                        : isDone
                        ? 'bg-[#7C5CFC] text-white'
                        : 'bg-[#E8E6E1] text-[#6B6B6B]'
                    )}
                  >
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={clsx(
                      'text-xs hidden sm:inline',
                      isActive ? 'text-[#1A1A1A] font-medium' : 'text-[#6B6B6B]'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 flex p-6 sm:p-10 overflow-auto">
          <div className="flex flex-col gap-6 flex-1 max-w-[720px] mx-auto w-full">
            {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
            {step === 2 && (
              <ConnectStep
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <ReadyStep onBack={() => setStep(2)} onFinish={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Step 1: Welcome ─── */
const WelcomeStep: FC<{ onNext: () => void }> = ({ onNext }) => {
  const t = useT();

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      title: 'Create a persona',
      desc: 'Define your brand voice, tone, and style — Mav writes like you.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      title: 'Connect your channels',
      desc: 'Link X, LinkedIn, Bluesky, and 30+ platforms in one click.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
        </svg>
      ),
      title: 'Let your agent work',
      desc: 'Mav generates, schedules, and publishes — you review and approve.',
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7C5CFC] mb-5">
          {/* Agent dot */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#7C5CFC]" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">
          {t('welcome_to_mav', 'Welcome to Mav')}
        </h1>
        <p className="text-[#6B6B6B] text-sm mt-2 max-w-md mx-auto">
          Your autonomous social media agent. Here&apos;s how it works:
        </p>
      </div>

      {/* Feature cards */}
      <div className="flex flex-col gap-3 flex-1">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#E8E6E1] hover:border-[#7C5CFC]/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#7C5CFC]/[0.08] flex items-center justify-center shrink-0">
              {f.icon}
            </div>
            <div>
              <div className="text-[15px] font-medium text-[#1A1A1A]">
                <span className="text-[#7C5CFC] font-semibold mr-2">
                  {i + 1}.
                </span>
                {f.title}
              </div>
              <p className="text-[13px] text-[#6B6B6B] mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How approval works — mini diagram */}
      <div className="mt-6 p-4 rounded-xl bg-[#7C5CFC]/[0.04] border border-[#7C5CFC]/[0.08]">
        <div className="text-xs text-[#7C5CFC] font-semibold uppercase tracking-wide mb-3">
          The Mav loop
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-[#6B6B6B]">
          <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E6E1] font-medium text-[#1A1A1A]">
            Agent drafts
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
          <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E6E1] font-medium text-[#1A1A1A]">
            You approve
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
          <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E6E1] font-medium text-[#1A1A1A]">
            Mav publishes
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-6 mt-2">
        <button
          onClick={onNext}
          className="group flex items-center gap-3 bg-[#7C5CFC] hover:bg-[#6D4AED] text-white font-semibold px-8 py-3 rounded-xl text-[15px] transition-all"
        >
          {t('lets_go', "Let's go")}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:translate-x-0.5 transition-transform"
          >
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* Top platforms to feature in onboarding */
const FEATURED_PLATFORMS = [
  'x', 'linkedin', 'linkedin-page', 'instagram', 'facebook', 'threads',
  'bluesky', 'tiktok', 'reddit', 'youtube',
];

/* ─── Step 2: Connect Channels ─── */
const ConnectStep: FC<{ onNext: () => void; onBack: () => void }> = ({
  onNext,
  onBack,
}) => {
  const fetch = useFetch();
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  const getIntegrations = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);

  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    return list;
  }, []);

  const { data: integrations } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      integrations,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [integrations]);

  const { data } = useSWR('get-all-integrations-onboarding', getIntegrations);

  const allSocial = data?.social || [];
  const featured = allSocial.filter((s: any) =>
    FEATURED_PLATFORMS.includes(s.identifier)
  );
  const rest = allSocial.filter(
    (s: any) => !FEATURED_PLATFORMS.includes(s.identifier)
  );
  const visiblePlatforms = showAll ? [...featured, ...rest] : featured;

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">
          {t('connect_your_channels', 'Connect your channels')}
        </h2>
        <p className="text-[#6B6B6B] text-sm mt-1">
          {t(
            'connect_social_media_to_start',
            'Link the platforms where your agent will publish'
          )}
        </p>
      </div>

      {/* Connected channels */}
      {sortedIntegrations.length > 0 && (
        <div className="bg-[#DCFCE7]/50 border border-[#16A34A]/20 rounded-xl p-4">
          <div className="text-[13px] font-medium text-[#16A34A] mb-3">
            Connected ({sortedIntegrations.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedIntegrations.map((integration: any) => (
              <div
                key={integration.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-[#E8E6E1]"
              >
                <div className="relative w-6 h-6">
                  <Image
                    src={integration.picture}
                    className="rounded-full"
                    alt={integration.identifier}
                    width={24}
                    height={24}
                  />
                  <Image
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="rounded-full absolute -bottom-0.5 -end-0.5 border border-white"
                    alt={integration.identifier}
                    width={12}
                    height={12}
                  />
                </div>
                <span className="text-[13px] text-[#1A1A1A]">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform grid — curated */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-5 gap-2">
          {visiblePlatforms.map((item: any) => (
            <PlatformTile key={item.identifier} item={item} onboarding />
          ))}
        </div>
        {rest.length > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[13px] text-[#7C5CFC] hover:text-[#6D4AED] font-medium self-center mt-1 transition-colors cursor-pointer"
          >
            Show {rest.length} more platforms
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="text-[13px] text-[#6B6B6B] hover:text-[#1A1A1A] font-medium self-center mt-1 transition-colors cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-4 mt-auto">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] font-medium px-4 py-2.5 rounded-xl text-[14px] transition-colors"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          {t('back', 'Back')}
        </button>
        <button
          onClick={onNext}
          className="group flex items-center gap-3 bg-[#7C5CFC] hover:bg-[#6D4AED] text-white font-semibold px-8 py-3 rounded-xl text-[15px] transition-all"
        >
          {sortedIntegrations.length > 0
            ? t('continue', 'Continue')
            : t('skip_for_now', 'Skip for now')}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:translate-x-0.5 transition-transform"
          >
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ─── Platform tile (clean, compact) ─── */
const PlatformTile: FC<{ item: any; onboarding?: boolean }> = ({ item, onboarding }) => {
  const fetch = useFetch();
  const modal = useModals();
  const router = useRouter();
  const toaster = useToaster();
  const { extensionId } = useVariables();

  const handleClick = useCallback(async () => {
    const onboardingParam = onboarding ? '?onboarding=true' : '';

    if (item.customFields) {
      modal.openModal({
        title: `Connect ${item.name}`,
        withCloseButton: true,
        children: (
          <CustomVariables
            identifier={item.identifier}
            gotoUrl={(url: string) => router.push(url)}
            variables={item.customFields}
            onboarding={onboarding}
          />
        ),
      });
      return;
    }

    const { url, err } = await (
      await fetch(`/integrations/social/${item.identifier}${onboardingParam}`)
    ).json();

    if (err) {
      toaster.show('Could not connect to this platform', 'warning');
      return;
    }
    window.location.href = url;
  }, [item, onboarding]);

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-[#E8E6E1] hover:border-[#7C5CFC]/40 hover:bg-[#7C5CFC]/[0.03] transition-all cursor-pointer group"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-[#F5F5F3] group-hover:bg-[#7C5CFC]/[0.06] transition-colors">
        {item.identifier === 'youtube' ? (
          <img src="/icons/platforms/youtube.svg" className="w-6 h-6" alt={item.name} />
        ) : (
          <img
            src={`/icons/platforms/${item.identifier}.png`}
            className="w-6 h-6 rounded-full"
            alt={item.name}
          />
        )}
      </div>
      <span className="text-[11px] text-[#6B6B6B] group-hover:text-[#1A1A1A] font-medium text-center leading-tight transition-colors">
        {item.name}
      </span>
    </button>
  );
};

/* ─── Step 3: Ready ─── */
const ReadyStep: FC<{ onBack: () => void; onFinish: () => void }> = ({
  onBack,
  onFinish,
}) => {
  const t = useT();

  const quickTips: Array<{
    icon: string;
    title: string;
    desc: string;
    href?: string;
    linkLabel?: string;
  }> = [
    {
      icon: '🎭',
      title: 'Set up your persona',
      desc: 'Define your brand voice, tone, and style — this is what makes your content sound like you.',
      href: '/personas',
      linkLabel: 'Go to Personas',
    },
    {
      icon: '✍️',
      title: 'Generate your first post',
      desc: 'Click "Generate Post" on the Dashboard — pick a topic and platform, and watch Mav draft it.',
      href: '/dashboard',
      linkLabel: 'Go to Dashboard',
    },
    {
      icon: '✅',
      title: 'Review in the approval queue',
      desc: 'Every draft lands here. Preview exactly how it looks on each platform before publishing.',
      href: '/approvals',
      linkLabel: 'Go to Approvals',
    },
    {
      icon: '📊',
      title: 'Watch it grow',
      desc: 'Track performance over time. Mav learns what works and adjusts.',
      href: '/analytics',
      linkLabel: 'Go to Analytics',
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Celebration header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#DCFCE7] mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">
          {t('youre_all_set', "You're all set!")}
        </h2>
        <p className="text-[#6B6B6B] text-sm mt-1">
          Here&apos;s how to get the most out of Mav:
        </p>
      </div>

      {/* Quick-start tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {quickTips.map((tip, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-[#E8E6E1] hover:border-[#7C5CFC]/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{tip.icon}</span>
              <span className="text-[14px] font-medium text-[#1A1A1A]">
                {tip.title}
              </span>
            </div>
            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
              {tip.desc}
            </p>
            {tip.href && (
              <a
                href={tip.href}
                className="text-[12px] text-[#7C5CFC] font-medium hover:text-[#6D4AED] mt-auto pt-1 inline-flex items-center gap-1 transition-colors"
              >
                {tip.linkLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-4 text-center">
        <p className="text-[12px] text-[#A3A3A3]">
          Tip: You can always access help from the sidebar
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-6 mt-2">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] font-medium px-4 py-2.5 rounded-xl text-[14px] transition-colors"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          {t('back', 'Back')}
        </button>
        <button
          onClick={onFinish}
          className="group flex items-center gap-3 bg-[#7C5CFC] hover:bg-[#6D4AED] text-white font-semibold px-8 py-3 rounded-xl text-[15px] transition-all"
        >
          {t('go_to_dashboard', 'Go to Dashboard')}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:translate-x-0.5 transition-transform"
          >
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
