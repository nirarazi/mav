'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import Link from 'next/link';
import { useUser } from '@maverick/frontend/components/layout/user.context';

// --- Types ---

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

interface Persona {
  id: string;
  name: string;
}

interface BrainStatus {
  ready: boolean;
  recentSessions?: BrainSession[];
}

interface BrainSession {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

// --- Helpers ---

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'threads', label: 'Threads' },
  { value: 'mastodon', label: 'Mastodon' },
];

const PLATFORM_TAG_STYLES: Record<string, string> = {
  linkedin: 'bg-[#DBEAFE] text-[#1D4ED8]',
  x: 'bg-[#F4F4F5] text-[#3F3F46]',
  bluesky: 'bg-[#DBEAFE] text-[#1D4ED8]',
  threads: 'bg-[#F4F4F5] text-[#3F3F46]',
  mastodon: 'bg-[#EDE9FE] text-[#7C5CFC]',
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

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// --- Sub-components ---

const StatCard: FC<{
  label: string;
  value: string | number;
  accentColor: string;
  valueColor?: string;
  subtitle?: string;
  subtitleColor?: string;
  loading?: boolean;
}> = ({ label, value, accentColor, valueColor, subtitle, subtitleColor, loading }) => (
  <div className="bg-white border border-[#E8E6E1] rounded-2xl p-5 relative overflow-hidden">
    <div
      className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.08]"
      style={{ background: accentColor }}
    />
    <div className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
      {label}
    </div>
    {loading ? (
      <div className="h-8 w-16 bg-[#F5F3EF] rounded animate-pulse" />
    ) : (
      <div
        className="text-[32px] font-extrabold tracking-tighter leading-none"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
    )}
    {subtitle && (
      <div
        className="text-xs font-medium mt-1.5"
        style={subtitleColor ? { color: subtitleColor } : undefined}
      >
        {subtitle}
      </div>
    )}
  </div>
);

const GeneratePostForm: FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const fetch = useFetch();
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const response = await fetch('/brain/generate', {
        method: 'POST',
        body: JSON.stringify({ platform, topic }),
      });
      if (response.ok) {
        setResult('success');
        setTopic('');
        onSuccess();
      } else {
        setResult('error');
      }
    } catch {
      setResult('error');
    } finally {
      setIsGenerating(false);
    }
  }, [fetch, platform, topic, onSuccess]);

  return (
    <div className="bg-white border border-[#E8E6E1] rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPlatform(p.value)}
            className={`px-3 py-1.5 rounded-[20px] text-xs font-semibold transition-colors ${
              platform === p.value
                ? PLATFORM_TAG_STYLES[p.value] || 'bg-[#EDE9FE] text-[#7C5CFC]'
                : 'bg-[#F5F3EF] text-[#A3A3A3] hover:text-[#6B6B6B]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="What should the post be about?"
        rows={3}
        className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#A3A3A3] outline-none focus:border-[#7C5CFC]/50 transition-colors resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="bg-[#7C5CFC] hover:bg-[#6D4AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-5 rounded-[20px] transition-all flex items-center gap-2 shadow-[0_2px_6px_rgba(124,92,252,0.25)] hover:shadow-[0_4px_12px_rgba(124,92,252,0.35)] hover:-translate-y-px"
        >
          {isGenerating && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isGenerating ? 'Generating...' : 'Create content'}
        </button>

        {result === 'success' && (
          <span className="text-sm text-[#16A34A] flex items-center gap-1">
            Post generated and queued for approval.{' '}
            <Link
              href="/approvals"
              className="underline hover:opacity-80"
            >
              Review
            </Link>
          </span>
        )}
        {result === 'error' && (
          <span className="text-sm text-[#DC2626]">
            Generation failed. Try again.
          </span>
        )}
      </div>
    </div>
  );
};

type ActivityEntry =
  | { kind: 'approval'; item: ApprovalItem }
  | { kind: 'session'; session: BrainSession };

type FeedFilter = 'all' | 'needs-review' | 'published' | 'agent';

const ActivityCard: FC<{ entry: ActivityEntry }> = ({ entry }) => {
  if (entry.kind === 'session') {
    const s = entry.session;
    return (
      <div className="bg-white border border-[#E8E6E1] rounded-2xl px-6 py-5 transition-all hover:border-[#D0CEC8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-[#A3A3A3] text-[11.5px] font-medium">
            {getRelativeTime(s.completedAt || s.startedAt)}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold bg-[#EDE9FE] text-[#7C5CFC]">
            Agent Brain
          </span>
        </div>
        <div className="text-[15px] leading-relaxed text-[#6B6B6B] mb-1">
          Brain cycle {s.status.toLowerCase()} &middot; {getRelativeTime(s.completedAt || s.startedAt)}
        </div>
      </div>
    );
  }

  const item = entry.item;
  const status = item.status.toUpperCase();
  const platform = item.payload?.platform || 'unknown';
  const content = truncate(item.payload?.content || '', 140);
  const isNeedsReview = status === 'PENDING';
  const isPublished = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  const riskLevel = item.riskScore > 0.6 ? 'medium' : 'low';

  const cardClass = isNeedsReview
    ? 'bg-gradient-to-br from-[#FEFCFF] to-[#F9F5FF] border-[#7C5CFC]'
    : 'bg-white border-[#E8E6E1] hover:border-[#D0CEC8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]';

  const platformTagStyle = PLATFORM_TAG_STYLES[platform.toLowerCase()] || 'bg-[#F4F4F5] text-[#3F3F46]';

  return (
    <div className={`border rounded-2xl px-6 py-5 transition-all ${cardClass}`}>
      {/* Tag row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[#A3A3A3] text-[11.5px] font-medium">
          {getRelativeTime(item.createdAt)}
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold ${platformTagStyle}`}>
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </span>
        {isPublished && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold bg-[#DCFCE7] text-[#16A34A]">
            Published
          </span>
        )}
        {isNeedsReview && (
          <>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold bg-[#EDE9FE] text-[#7C5CFC]">
              Needs review
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold ${
              riskLevel === 'medium'
                ? 'bg-[#FEF3C7] text-[#D97706]'
                : 'bg-[#DCFCE7] text-[#16A34A]'
            }`}>
              {riskLevel === 'medium' ? 'Medium risk' : 'Low risk'}
            </span>
          </>
        )}
        {isRejected && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] text-[11.5px] font-semibold bg-[#FEE2E2] text-[#DC2626]">
            Rejected
          </span>
        )}
      </div>

      {/* Warning box for medium risk */}
      {isNeedsReview && riskLevel === 'medium' && (
        <div className="flex items-center gap-2 bg-[#FEF3C7] text-[#D97706] px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Topic may attract controversy
        </div>
      )}

      {/* Content */}
      {content && (
        <div className={`text-[15px] leading-relaxed mb-3 ${
          isPublished || isNeedsReview ? 'text-[#1A1A1A]' : 'text-[#6B6B6B]'
        }`}>
          {content}
        </div>
      )}

      {/* Actions */}
      {isNeedsReview && (
        <div className="flex flex-wrap gap-2 mt-3.5">
          <Link
            href={`/approvals`}
            className="bg-[#7C5CFC] text-white text-[13px] font-semibold py-2 px-[18px] rounded-[10px] transition-all hover:bg-[#6B4FE0] hover:-translate-y-px shadow-[0_2px_6px_rgba(124,92,252,0.25)] hover:shadow-[0_4px_12px_rgba(124,92,252,0.35)]"
          >
            Approve
          </Link>
          <Link
            href={`/approvals`}
            className="bg-white text-[#6B6B6B] text-[13px] font-semibold py-2 px-[18px] rounded-[10px] border-[1.5px] border-[#E8E6E1] transition-colors hover:border-[#C0BDB6] hover:text-[#1A1A1A]"
          >
            Edit
          </Link>
          <button className="bg-[#FEE2E2] text-[#DC2626] text-[13px] font-semibold py-2 px-[18px] rounded-[10px] border border-[rgba(220,38,38,0.15)] transition-colors hover:bg-[#FECACA]">
            Reject
          </button>
        </div>
      )}

      {isPublished && (
        <div className="flex flex-wrap gap-2 mt-3.5">
          <button className="text-[#A3A3A3] text-[13px] font-semibold underline underline-offset-2 hover:text-[#6B6B6B] transition-colors bg-transparent border-none py-2 px-1">
            View on {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main Dashboard ---

export const AgentDashboard: FC = () => {
  const fetch = useFetch();
  const user = useUser();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  // Fetch pending approvals
  const loadPending = useCallback(async () => {
    const response = await fetch('/approvals/pending');
    return (await response.json()) as ApprovalItem[];
  }, []);

  const { data: pendingItems, isLoading: pendingLoading } = useSWR(
    'dashboard-pending',
    loadPending,
    { refreshInterval: 30000, fallbackData: [] }
  );

  // Fetch approval history
  const loadHistory = useCallback(async () => {
    const response = await fetch('/approvals/history?take=20');
    return (await response.json()) as ApprovalItem[];
  }, []);

  const {
    data: historyItems,
    isLoading: historyLoading,
    mutate: mutateHistory,
  } = useSWR('dashboard-history', loadHistory, {
    refreshInterval: 30000,
    fallbackData: [],
  });

  // Fetch active persona
  const loadPersona = useCallback(async () => {
    const response = await fetch('/personas/active');
    if (!response.ok) return null;
    return (await response.json()) as Persona | null;
  }, []);

  const { data: activePersona, isLoading: personaLoading } = useSWR(
    'dashboard-persona',
    loadPersona,
    { fallbackData: null }
  );

  // Fetch brain status
  const loadBrainStatus = useCallback(async () => {
    const response = await fetch('/brain/status');
    if (!response.ok) return { ready: false };
    return (await response.json()) as BrainStatus;
  }, []);

  const { data: brainStatus, isLoading: brainLoading } = useSWR(
    'dashboard-brain',
    loadBrainStatus,
    { refreshInterval: 30000, fallbackData: { ready: false } }
  );

  // Compute stats
  const postsToday = useMemo(() => {
    const today = new Date().toDateString();
    return (historyItems || []).filter(
      (item) =>
        item.status.toUpperCase() === 'APPROVED' &&
        new Date(item.createdAt).toDateString() === today
    ).length;
  }, [historyItems]);

  const pendingCount = (pendingItems || []).length;
  const brainReady = brainStatus?.ready;

  // Build activity feed
  const activityFeed = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [];

    for (const item of historyItems || []) {
      entries.push({ kind: 'approval', item });
    }
    for (const item of pendingItems || []) {
      entries.push({ kind: 'approval', item });
    }
    for (const session of brainStatus?.recentSessions || []) {
      entries.push({ kind: 'session', session });
    }

    entries.sort((a, b) => {
      const dateA =
        a.kind === 'approval'
          ? a.item.createdAt
          : a.session.completedAt || a.session.startedAt;
      const dateB =
        b.kind === 'approval'
          ? b.item.createdAt
          : b.session.completedAt || b.session.startedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return entries;
  }, [historyItems, pendingItems, brainStatus]);

  // Filter activity feed
  const filteredFeed = useMemo(() => {
    if (feedFilter === 'all') return activityFeed;
    if (feedFilter === 'needs-review') {
      return activityFeed.filter(
        (e) => e.kind === 'approval' && e.item.status.toUpperCase() === 'PENDING'
      );
    }
    if (feedFilter === 'published') {
      return activityFeed.filter(
        (e) => e.kind === 'approval' && e.item.status.toUpperCase() === 'APPROVED'
      );
    }
    if (feedFilter === 'agent') {
      return activityFeed.filter((e) => e.kind === 'session');
    }
    return activityFeed;
  }, [activityFeed, feedFilter]);

  const handleGenerateSuccess = useCallback(() => {
    mutateHistory();
  }, [mutateHistory]);

  const isLoading =
    pendingLoading && historyLoading && personaLoading && brainLoading;

  const firstName = user?.name?.split(' ')[0] || 'there';

  const filterButtons: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'needs-review', label: 'Needs review' },
    { key: 'published', label: 'Published' },
    { key: 'agent', label: 'Agent' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#FAFAF8]">
      <div className="max-w-[900px] mx-auto px-6 py-9 flex flex-col">
        {/* Greeting */}
        <h1 className="text-[28px] font-extrabold tracking-tighter text-[#1A1A1A] mb-1">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[15px] text-[#6B6B6B] mb-8">
          {pendingCount > 0
            ? `${pendingCount} post${pendingCount !== 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} your review. Everything else is running smoothly.`
            : 'Your social presence, on autopilot.'}
        </p>

        {/* Bento Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-9">
          <StatCard
            label="Published"
            value={postsToday}
            accentColor="#7C5CFC"
            loading={historyLoading}
          />
          <StatCard
            label="Needs review"
            value={pendingCount}
            accentColor="#D97706"
            valueColor={pendingCount > 0 ? '#7C5CFC' : undefined}
            loading={pendingLoading}
          />
          <StatCard
            label="Persona"
            value={activePersona?.name || 'None'}
            accentColor="#16A34A"
            loading={personaLoading}
          />
          <StatCard
            label="Agent"
            value={brainReady ? 'Ready' : 'Offline'}
            accentColor="#2563EB"
            valueColor={brainReady ? '#16A34A' : '#DC2626'}
            loading={brainLoading}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-9">
          <button
            onClick={() => setShowGenerateForm((prev) => !prev)}
            className={`text-sm font-semibold py-2 px-5 rounded-[20px] transition-all flex items-center gap-2 ${
              showGenerateForm
                ? 'bg-[#5B3DD6] text-white shadow-[0_2px_6px_rgba(124,92,252,0.25)]'
                : 'bg-[#7C5CFC] hover:bg-[#6D4AED] text-white shadow-[0_2px_6px_rgba(124,92,252,0.25)] hover:shadow-[0_4px_12px_rgba(124,92,252,0.35)] hover:-translate-y-px'
            }`}
          >
            {showGenerateForm ? 'Close' : 'Create content'}
          </button>
          <Link
            href="/approvals"
            className="text-sm font-semibold py-2 px-5 rounded-[20px] border-[1.5px] border-[#E8E6E1] text-[#6B6B6B] hover:border-[#C0BDB6] hover:text-[#1A1A1A] bg-white transition-colors"
          >
            Review approvals
          </Link>
          <Link
            href="/launches"
            className="text-sm font-semibold py-2 px-5 rounded-[20px] border-[1.5px] border-[#E8E6E1] text-[#6B6B6B] hover:border-[#C0BDB6] hover:text-[#1A1A1A] bg-white transition-colors"
          >
            View calendar
          </Link>
        </div>

        {/* Generate Post Inline Form */}
        {showGenerateForm && (
          <div className="mb-9">
            <GeneratePostForm onSuccess={handleGenerateSuccess} />
          </div>
        )}

        {/* Activity Feed */}
        <div className="flex flex-col">
          {/* Section header with filter pills */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold tracking-tight text-[#1A1A1A]">
              Activity
            </h2>
            <div className="flex gap-1">
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFeedFilter(f.key)}
                  className={`px-3 py-1.5 rounded-[20px] text-xs font-semibold transition-all border ${
                    feedFilter === f.key
                      ? 'bg-white border-[#E8E6E1] text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                      : 'border-transparent text-[#A3A3A3] hover:bg-[#F5F3EF] hover:text-[#6B6B6B]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E8E6E1] rounded-2xl h-24 animate-pulse"
                />
              ))}
            </div>
          ) : filteredFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3 text-[#A3A3A3]">~</div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                Your feed is quiet
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Create your first post to get things rolling.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredFeed.map((entry, i) => (
                <ActivityCard key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
