'use client';

import { FC, useCallback, useMemo, useState } from 'react';
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
      className="flex items-center justify-between w-full shrink-0 px-4"
      style={{
        height: '36px',
        backgroundColor: '#141414',
        borderBottom: '1px solid #252525',
      }}
    >
      {/* Left side: status info */}
      <div className="flex items-center gap-3 text-xs min-w-0">
        {/* Status dot */}
        <span
          className="inline-block shrink-0 rounded-full"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: paused
              ? '#ef4444'
              : isActive
                ? '#22c55e'
                : '#eab308',
          }}
        />

        {paused ? (
          <span className="text-gray-400 truncate">
            <span className="text-white font-medium">Agent Paused</span>
            <Separator />
            All autonomous activity halted
            <Separator />
            Resume to continue
          </span>
        ) : isIdle ? (
          <span className="text-gray-400 truncate">
            <span className="text-white font-medium">Agent Idle</span>
            <Separator />
            No persona configured
            <Separator />
            Set up your first persona to get started
          </span>
        ) : (
          <span className="text-gray-400 truncate">
            <span className="text-white font-medium">Agent Active</span>
            {status.activePersona && (
              <>
                <Separator />
                Persona:{' '}
                <span className="text-white">{status.activePersona.name}</span>
              </>
            )}
            {status.pendingApprovals > 0 && (
              <>
                <Separator />
                <span className="text-white">
                  {status.pendingApprovals}
                </span>{' '}
                pending approval{status.pendingApprovals !== 1 ? 's' : ''}
              </>
            )}
            {lastCycle && (
              <>
                <Separator />
                Last cycle:{' '}
                <span className="text-white">{lastCycle}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Right side: pause/resume button */}
      <button
        onClick={() => setPaused((p) => !p)}
        className="shrink-0 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1 transition-colors ml-4"
      >
        {paused ? '\u25B6 Resume' : '\u23F8 Pause'}
      </button>
    </div>
  );
};

const Separator: FC = () => (
  <span className="mx-1.5 text-gray-600">&middot;</span>
);
