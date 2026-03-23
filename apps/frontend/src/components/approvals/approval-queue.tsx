'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import { LoadingComponent } from '@maverick/frontend/components/layout/loading';
import { useToaster } from '@maverick/react/toaster/toaster';
import { PostPreview, PLATFORM_CHAR_LIMITS } from './post-preview';

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
  x: { bg: 'bg-[#F4F4F5]', text: 'text-[#3F3F46]', label: 'X' },
  twitter: { bg: 'bg-[#F4F4F5]', text: 'text-[#3F3F46]', label: 'X' },
  linkedin: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', label: 'LinkedIn' },
  bluesky: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Bluesky' },
  facebook: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Facebook' },
  instagram: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Instagram' },
  youtube: { bg: 'bg-red-100', text: 'text-red-700', label: 'YouTube' },
  tiktok: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'TikTok' },
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
  if (score < 0.3) return { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', label: 'Low' };
  if (score <= 0.6) return { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', label: 'Medium' };
  return { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', label: 'High' };
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

  const needsReview = item.status === 'pending';
  const isHighRisk = item.riskScore > 0.6;
  const isMedRisk = item.riskScore > 0.3 && item.riskScore <= 0.6;

  return (
    <div
      className={`bg-white rounded-[16px] p-5 flex flex-col gap-3 transition-all hover:shadow-sm ${
        needsReview && isMedRisk
          ? 'border-[1.5px] border-[#D97706]'
          : needsReview
          ? 'border-[1.5px] border-[#7C5CFC]'
          : 'border border-[#E8E6E1]'
      }`}
      style={
        needsReview && isMedRisk
          ? { background: 'linear-gradient(135deg, #FFFEFB, #FFFBEB)' }
          : needsReview
          ? { background: 'linear-gradient(135deg, #FEFCFF, #F9F5FF)' }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[#A3A3A3]">
            {getRelativeTime(item.createdAt)}
          </span>
          <span
            className={`${platformStyle.bg} ${platformStyle.text} text-xs font-semibold px-2.5 py-1 rounded-full`}
          >
            {platformStyle.label}
          </span>
          {needsReview && (
            <span className="bg-[#EDE9FE] text-[#7C5CFC] text-xs font-semibold px-2.5 py-1 rounded-full">
              Needs review
            </span>
          )}
          <span
            className={`${riskStyle.bg} ${riskStyle.text} text-xs font-semibold px-2.5 py-1 rounded-full`}
          >
            {riskStyle.label} risk
          </span>
        </div>
      </div>

      {item.payload.topic && (
        <div className="text-sm text-[#6B6B6B]">
          Topic: {item.payload.topic}
        </div>
      )}

      <PostPreview
        platform={item.payload.platform}
        content={item.payload.content}
        personaName="Nir Arazi"
        personaRole="Founder & CEO"
        charLimit={
          PLATFORM_CHAR_LIMITS[item.payload.platform?.toLowerCase()] || 500
        }
      />

      {item.expiresAt && (
        <div className="text-xs text-[#A3A3A3]">
          Expires: {new Date(item.expiresAt).toLocaleString()}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-1">
        <input
          type="text"
          placeholder="Optional feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#7C5CFC] transition-colors placeholder:text-[#A3A3A3]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 px-5 rounded-full transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="bg-white hover:bg-[#FEE2E2] disabled:opacity-50 disabled:cursor-not-allowed text-[#DC2626] text-xs font-semibold py-2 px-5 rounded-full border border-[#DC2626] transition-colors"
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
      className="text-[#A3A3A3] mb-4"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <h3 className="text-lg font-medium text-[#1A1A1A] mb-1">
      No pending approvals
    </h3>
    <p className="text-sm text-[#6B6B6B]">
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
    <div className="flex-1 p-6 overflow-auto" style={{ backgroundColor: '#FAFAF8' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Approvals</h1>
          {items.length > 0 && (
            <span className="bg-[#EDE9FE] text-[#7C5CFC] text-xs font-semibold px-3 py-1 rounded-full">
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
