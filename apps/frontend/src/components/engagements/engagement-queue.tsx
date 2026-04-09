'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@mav/helpers/utils/custom.fetch';
import { LoadingComponent } from '@mav/frontend/components/layout/loading';
import { useToaster } from '@mav/react/toaster/toaster';

interface Engagement {
  id: string;
  platform: string;
  type: string;
  tier: number;
  incomingText: string;
  authorName: string;
  authorHandle: string;
  sentiment: number;
  confidence: number;
  status: string;
  responseText: string | null;
  createdAt: string;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Passive', color: 'bg-gray-100 text-gray-600' },
  2: { label: 'Acknowledgment', color: 'bg-green-100 text-green-700' },
  3: { label: 'Conversational', color: 'bg-blue-100 text-blue-700' },
  4: { label: 'Proactive', color: 'bg-purple-100 text-purple-700' },
  5: { label: 'Sensitive', color: 'bg-red-100 text-red-700' },
};

const PLATFORM_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  x: { bg: 'bg-[#F4F4F5]', text: 'text-[#3F3F46]', label: 'X' },
  linkedin: {
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1D4ED8]',
    label: 'LinkedIn',
  },
  bluesky: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Bluesky' },
};

function getSentimentLabel(s: number): { label: string; color: string } {
  if (s > 0.3) return { label: 'Positive', color: 'text-green-600' };
  if (s < -0.3) return { label: 'Negative', color: 'text-red-600' };
  return { label: 'Neutral', color: 'text-gray-500' };
}

const EngagementCard: FC<{
  item: Engagement;
  onTeach: (id: string, response: string) => Promise<void>;
}> = ({ item, onTeach }) => {
  const [teachResponse, setTeachResponse] = useState('');
  const [showTeach, setShowTeach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tierStyle = TIER_LABELS[item.tier] ?? {
    label: 'Unknown',
    color: 'bg-gray-100 text-gray-600',
  };
  const platformStyle = PLATFORM_STYLES[item.platform?.toLowerCase()] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: item.platform,
  };
  const sentimentStyle = getSentimentLabel(item.sentiment);

  const handleTeach = useCallback(async () => {
    if (!teachResponse.trim()) return;
    setIsSubmitting(true);
    try {
      await onTeach(item.id, teachResponse);
      setShowTeach(false);
      setTeachResponse('');
    } finally {
      setIsSubmitting(false);
    }
  }, [item.id, teachResponse, onTeach]);

  return (
    <div className="rounded-xl border border-[#E8E5E0] bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${platformStyle.bg} ${platformStyle.text}`}
          >
            {platformStyle.label}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierStyle.color}`}
          >
            {tierStyle.label}
          </span>
          <span className={`text-xs ${sentimentStyle.color}`}>
            {sentimentStyle.label}
          </span>
        </div>
        <span className="text-xs text-[#A3A09B]">
          {item.confidence >= 0.7
            ? 'High confidence'
            : item.confidence >= 0.4
              ? 'Low confidence'
              : 'Skipped'}
        </span>
      </div>

      <div className="text-sm">
        <span className="font-medium text-[#3F3F46]">
          {item.authorHandle}
        </span>
        <p className="mt-1 text-[#52525B]">{item.incomingText}</p>
      </div>

      {item.responseText && (
        <div className="bg-[#FAFAF8] rounded-lg p-3 text-sm text-[#52525B] border-l-2 border-[#7C5CFC]">
          <span className="text-xs text-[#A3A09B] block mb-1">
            Agent reply:
          </span>
          {item.responseText}
        </div>
      )}

      {item.status === 'SKIPPED' && (
        <div>
          {!showTeach ? (
            <button
              onClick={() => setShowTeach(true)}
              className="text-xs text-[#7C5CFC] hover:underline"
            >
              Teach the agent how to respond
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={teachResponse}
                onChange={(e) => setTeachResponse(e.target.value)}
                placeholder="How should the agent have responded?"
                className="w-full text-sm border border-[#E8E5E0] rounded-lg p-2 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTeach}
                  disabled={isSubmitting || !teachResponse.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#7C5CFC] text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Example'}
                </button>
                <button
                  onClick={() => setShowTeach(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E5E0] text-[#52525B]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EngagementQueue: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadEngagements = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    const response = await fetch(`/engagements?${params.toString()}`);
    return (await response.json()) as Engagement[];
  }, [statusFilter, fetch]);

  const {
    data: engagements,
    isLoading,
    mutate,
  } = useSWR(['engagements', statusFilter], loadEngagements, {
    refreshInterval: 30000,
    fallbackData: [],
  });

  const handleTeach = useCallback(
    async (id: string, response: string) => {
      try {
        await fetch(`/engagements/${id}/teach`, {
          method: 'POST',
          body: JSON.stringify({ idealResponse: response }),
        });
        toaster.show('Example saved — the agent will learn from this!', 'success');
        await mutate();
      } catch {
        toaster.show('Failed to save example', 'error');
      }
    },
    [fetch, toaster, mutate]
  );

  if (isLoading) return <LoadingComponent />;

  return (
    <div className="flex-1 p-6 overflow-auto max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">
          Engagements
        </h1>
        <p className="text-sm text-[#A3A09B] mt-1">
          Mentions, replies, and comments across your connected platforms
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'RESPONDED', 'SKIPPED', 'ESCALATED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                : 'border-[#E8E5E0] text-[#52525B] hover:bg-[#F4F4F5]'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {engagements && engagements.length > 0 ? (
          engagements.map((item) => (
            <EngagementCard key={item.id} item={item} onTeach={handleTeach} />
          ))
        ) : (
          <div className="text-center py-12 text-[#A3A09B]">
            <p className="text-lg font-medium">No engagements yet</p>
            <p className="text-sm mt-1">
              Connect platforms and enable engagement monitoring to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
