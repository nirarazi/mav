'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';

interface BrainStatus {
  ready: boolean;
  activePersona: { id: string; name: string; role: string } | null;
  connectedPlatforms: number;
  activeGoals: number;
  pendingApprovals: number;
  recentSessions: { startedAt: string }[];
}

function getTimeSince(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const AgentStatusBar: FC = () => {
  const fetch = useFetch();
  const [paused, setPaused] = useState(false);

  const loadStatus = useCallback(async () => {
    const response = await fetch('/brain/status');
    return (await response.json()) as BrainStatus;
  }, []);

  const { data: status } = useSWR('brain-status', loadStatus, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
    fallbackData: undefined,
  });

  const lastCycle = useMemo(() => {
    if (!status?.recentSessions?.length) return null;
    return getTimeSince(status.recentSessions[0].startedAt);
  }, [status]);

  // Don't render anything while loading to avoid flash
  if (!status) return null;

  const isActive = status.ready && !paused;
  const isIdle = !status.ready && !paused;

  return (
    <div
      className="flex items-center justify-between w-full shrink-0 px-4 sticky top-0 z-50"
      style={{
        height: '36px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E8E6E1',
      }}
    >
      {/* Left side: status info */}
      <div className="flex items-center gap-3 text-xs min-w-0">
        {/* Status pill */}
        {paused ? (
          <span className="inline-flex items-center gap-1.5 bg-[#FEE2E2] text-[#DC2626] font-semibold px-3 py-0.5 rounded-full text-xs">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#DC2626]" />
            Paused
          </span>
        ) : isActive ? (
          <span className="inline-flex items-center gap-1.5 bg-[#DCFCE7] text-[#16A34A] font-semibold px-3 py-0.5 rounded-full text-xs">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#16A34A] animate-pulse" />
            Agent running
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#D97706] font-semibold px-3 py-0.5 rounded-full text-xs">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#D97706]" />
            Idle
          </span>
        )}

        {paused ? (
          <span className="text-[#6B6B6B] truncate">
            All autonomous activity halted
            <Separator />
            Resume to continue
          </span>
        ) : isIdle ? (
          <span className="text-[#6B6B6B] truncate">
            {!status.activePersona ? (
              <>
                No persona configured
                <Separator />
                <Link href="/personas" className="text-[#7C5CFC] hover:text-[#6D4AED] font-medium transition-colors">
                  Set up your first persona
                </Link>
              </>
            ) : status.connectedPlatforms === 0 ? (
              <>
                Persona: <span className="text-[#1A1A1A] font-medium">{status.activePersona.name}</span>
                <Separator />
                <Link href="/launches" className="text-[#7C5CFC] hover:text-[#6D4AED] font-medium transition-colors">
                  Connect a channel to start publishing
                </Link>
              </>
            ) : (
              <>
                Persona: <span className="text-[#1A1A1A] font-medium">{status.activePersona.name}</span>
                <Separator />
                Standing by
              </>
            )}
          </span>
        ) : (
          <span className="text-[#6B6B6B] truncate">
            {status.activePersona && (
              <>
                Persona:{' '}
                <span className="text-[#1A1A1A] font-medium">{status.activePersona.name}</span>
              </>
            )}
            {status.pendingApprovals > 0 && (
              <>
                <Separator />
                <span className="inline-flex items-center bg-[#EDE9FE] text-[#7C5CFC] font-semibold px-2 py-0.5 rounded-full text-[10px] align-middle">
                  {status.pendingApprovals}
                </span>{' '}
                pending approval{status.pendingApprovals !== 1 ? 's' : ''}
              </>
            )}
            {lastCycle && (
              <>
                <Separator />
                Last cycle:{' '}
                <span className="text-[#1A1A1A] font-medium">{lastCycle}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Right side: pause/resume button */}
      <button
        onClick={() => setPaused((p) => !p)}
        data-tooltip-id="tooltip"
        data-tooltip-content={
          paused
            ? 'Resume autonomous activity — your agent will start drafting and scheduling posts again'
            : 'Pause autonomous activity — your agent will stop drafting new posts until you resume'
        }
        className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-colors ml-4 ${
          paused
            ? 'bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0]'
            : 'bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA]'
        }`}
      >
        {paused ? '\u25B6 Resume' : '\u23F8 Pause'}
      </button>
    </div>
  );
};

const Separator: FC = () => (
  <span className="mx-1.5 text-[#D0CEC8]">&middot;</span>
);
