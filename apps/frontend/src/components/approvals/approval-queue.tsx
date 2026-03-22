'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import { LoadingComponent } from '@maverick/frontend/components/layout/loading';
import { useToaster } from '@maverick/react/toaster/toaster';

interface ApprovalItem {
  id: string;
  type: string;
  status: string;
  payload: {
    platform: string;
    content: string;
    topic: string;
    personaId?: string;
  };
  riskScore: number;
  createdAt: string;
  expiresAt: string;
  feedback?: string;
}

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  x: { bg: 'bg-black', text: 'text-white', label: 'X' },
  twitter: { bg: 'bg-black', text: 'text-white', label: 'X' },
  linkedin: { bg: 'bg-blue-600', text: 'text-white', label: 'LinkedIn' },
  bluesky: { bg: 'bg-sky-500', text: 'text-white', label: 'Bluesky' },
  facebook: { bg: 'bg-blue-500', text: 'text-white', label: 'Facebook' },
  instagram: { bg: 'bg-pink-500', text: 'text-white', label: 'Instagram' },
  youtube: { bg: 'bg-red-600', text: 'text-white', label: 'YouTube' },
  tiktok: { bg: 'bg-gray-900', text: 'text-white', label: 'TikTok' },
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getRiskColor(score: number): { bg: string; text: string; label: string } {
  if (score < 0.3) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Low' };
  if (score <= 0.6) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' };
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'High' };
}

const ApprovalCard: FC<{
  item: ApprovalItem;
  onApprove: (id: string, feedback?: string) => Promise<void>;
  onReject: (id: string, feedback?: string) => Promise<void>;
}> = ({ item, onApprove, onReject }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const platformStyle = PLATFORM_STYLES[item.payload.platform?.toLowerCase()] || {
    bg: 'bg-gray-500',
    text: 'text-white',
    label: item.payload.platform || 'Unknown',
  };

  const riskStyle = getRiskColor(item.riskScore);

  const handleApprove = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onApprove(item.id, feedback || undefined);
    } finally {
      setIsSubmitting(false);
    }
  }, [item.id, feedback, onApprove]);

  const handleReject = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onReject(item.id, feedback || undefined);
    } finally {
      setIsSubmitting(false);
    }
  }, [item.id, feedback, onReject]);

  return (
    <div className="bg-newBgColor border border-fifth rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`${platformStyle.bg} ${platformStyle.text} text-xs font-medium px-2.5 py-1 rounded-full`}
          >
            {platformStyle.label}
          </span>
          <span
            className={`${riskStyle.bg} ${riskStyle.text} text-xs font-medium px-2.5 py-1 rounded-full`}
          >
            Risk: {riskStyle.label} ({Math.round(item.riskScore * 100)}%)
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {getRelativeTime(item.createdAt)}
        </span>
      </div>

      {item.payload.topic && (
        <div className="text-sm text-gray-400">
          Topic: {item.payload.topic}
        </div>
      )}

      <div className="bg-newBgColorInner rounded-md p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {item.payload.content}
      </div>

      {item.expiresAt && (
        <div className="text-xs text-gray-500">
          Expires: {new Date(item.expiresAt).toLocaleString()}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-1">
        <input
          type="text"
          placeholder="Optional feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full bg-newBgColorInner border border-fifth rounded-md px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState: FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400 mb-4"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <h3 className="text-lg font-medium text-gray-300 mb-1">
      No pending approvals
    </h3>
    <p className="text-sm text-gray-500">
      Your agent is on standby.
    </p>
  </div>
);

export const ApprovalQueue: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();

  const loadApprovals = useCallback(async () => {
    const response = await fetch('/approvals/pending');
    return (await response.json()) as ApprovalItem[];
  }, []);

  const { data, isLoading, mutate } = useSWR('approvals-pending', loadApprovals, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
    fallbackData: [],
  });

  const items = useMemo(() => data || [], [data]);

  const handleApprove = useCallback(
    async (id: string, feedback?: string) => {
      const optimisticData = items.filter((item) => item.id !== id);
      try {
        await mutate(
          async () => {
            await fetch(`/approvals/${id}/approve`, {
              method: 'POST',
              body: JSON.stringify({ feedback }),
            });
            return optimisticData;
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
          }
        );
        toaster.show('Approval confirmed', 'success');
      } catch {
        toaster.show('Failed to approve item', 'warning');
      }
    },
    [fetch, items, mutate, toaster]
  );

  const handleReject = useCallback(
    async (id: string, feedback?: string) => {
      const optimisticData = items.filter((item) => item.id !== id);
      try {
        await mutate(
          async () => {
            await fetch(`/approvals/${id}/reject`, {
              method: 'POST',
              body: JSON.stringify({ feedback }),
            });
            return optimisticData;
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
          }
        );
        toaster.show('Item rejected', 'success');
      } catch {
        toaster.show('Failed to reject item', 'warning');
      }
    },
    [fetch, items, mutate, toaster]
  );

  if (isLoading && items.length === 0) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Approvals</h1>
          {items.length > 0 && (
            <span className="bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              {items.length} pending
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
