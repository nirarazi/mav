'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import Link from 'next/link';

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

// --- Sub-components ---

const StatCard: FC<{
  label: string;
  value: string | number;
  loading?: boolean;
}> = ({ label, value, loading }) => (
  <div className="bg-[#141414] rounded-xl p-5 flex flex-col gap-1 min-w-0 flex-1">
    {loading ? (
      <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
    ) : (
      <span className="text-2xl font-bold text-orange-500">{value}</span>
    )}
    <span className="text-sm text-gray-400">{label}</span>
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
    <div className="bg-[#141414] rounded-xl p-5 flex flex-col gap-4 border border-orange-500/20">
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPlatform(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              platform === p.value
                ? 'bg-orange-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
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
        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors flex items-center gap-2"
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
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>

        {result === 'success' && (
          <span className="text-sm text-green-400 flex items-center gap-1">
            Post generated and queued for approval.{' '}
            <Link
              href="/approvals"
              className="underline hover:text-green-300"
            >
              Review
            </Link>
          </span>
        )}
        {result === 'error' && (
          <span className="text-sm text-red-400">
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

const BORDER_COLORS: Record<string, string> = {
  APPROVED: 'border-l-green-500',
  PENDING: 'border-l-orange-500',
  REJECTED: 'border-l-red-500',
  session: 'border-l-blue-500',
};

const ActivityCard: FC<{ entry: ActivityEntry }> = ({ entry }) => {
  if (entry.kind === 'session') {
    const s = entry.session;
    return (
      <div
        className={`bg-[#141414] rounded-lg px-4 py-3 border-l-4 ${BORDER_COLORS.session}`}
      >
        <span className="text-sm text-gray-300">
          Agent brain cycle &middot;{' '}
          <span className="text-blue-400">{s.status}</span> &middot;{' '}
          <span className="text-gray-500">
            {getRelativeTime(s.completedAt || s.startedAt)}
          </span>
        </span>
      </div>
    );
  }

  const item = entry.item;
  const status = item.status.toUpperCase();
  const borderColor =
    BORDER_COLORS[status] || 'border-l-gray-600';
  const platform = item.payload?.platform || 'unknown';
  const content = truncate(item.payload?.content || '', 80);

  let prefix = '';
  let statusColor = 'text-gray-400';
  if (status === 'APPROVED') {
    prefix = 'Published to';
    statusColor = 'text-green-400';
  } else if (status === 'PENDING') {
    prefix = 'Awaiting approval';
    statusColor = 'text-orange-400';
  } else if (status === 'REJECTED') {
    prefix = 'Rejected';
    statusColor = 'text-red-400';
  }

  return (
    <div
      className={`bg-[#141414] rounded-lg px-4 py-3 border-l-4 ${borderColor}`}
    >
      <span className="text-sm text-gray-300">
        <span className={statusColor}>{prefix}</span>
        {status === 'APPROVED' && (
          <>
            {' '}
            <span className="text-white font-medium">{platform}</span>
          </>
        )}
        {status !== 'APPROVED' && (
          <>
            {' '}
            &middot;{' '}
            <span className="text-white font-medium">{platform}</span>
          </>
        )}
        {content && (
          <>
            {' '}
            &middot;{' '}
            <span className="text-gray-500">{content}</span>
          </>
        )}
        {' '}
        &middot;{' '}
        <span className="text-gray-500">
          {getRelativeTime(item.createdAt)}
        </span>
      </span>
    </div>
  );
};

// --- Main Dashboard ---

export const AgentDashboard: FC = () => {
  const fetch = useFetch();
  const [showGenerateForm, setShowGenerateForm] = useState(false);

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
  const personaName = activePersona?.name || 'None';
  const brainReady = brainStatus?.ready ? 'Ready' : 'Offline';

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

  const handleGenerateSuccess = useCallback(() => {
    mutateHistory();
  }, [mutateHistory]);

  const isLoading =
    pendingLoading && historyLoading && personaLoading && brainLoading;

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent activity and controls
          </p>
        </div>

        {/* Hero Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Posts Today"
            value={postsToday}
            loading={historyLoading}
          />
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            loading={pendingLoading}
          />
          <StatCard
            label="Active Persona"
            value={personaName}
            loading={personaLoading}
          />
          <StatCard
            label="Brain Status"
            value={brainReady}
            loading={brainLoading}
          />
        </div>

        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowGenerateForm((prev) => !prev)}
            className={`text-sm font-medium py-2 px-5 rounded-lg transition-colors ${
              showGenerateForm
                ? 'bg-orange-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            {showGenerateForm ? 'Close' : 'Generate Post'}
          </button>
          <Link
            href="/approvals"
            className="text-sm font-medium py-2 px-5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
          >
            Review Approvals
          </Link>
          <Link
            href="/launches"
            className="text-sm font-medium py-2 px-5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
          >
            View Calendar
          </Link>
        </div>

        {/* Generate Post Inline Form */}
        {showGenerateForm && (
          <GeneratePostForm onSuccess={handleGenerateSuccess} />
        )}

        {/* Activity Feed */}
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-white">Activity</h2>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#141414] rounded-lg h-12 animate-pulse"
                />
              ))}
            </div>
          ) : activityFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3 text-gray-600">~</div>
              <h3 className="text-lg font-medium text-gray-300 mb-1">
                No activity yet
              </h3>
              <p className="text-sm text-gray-500">
                Generate your first post to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activityFeed.map((entry, i) => (
                <ActivityCard key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
