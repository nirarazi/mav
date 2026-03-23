'use client';

import { FC, useState } from 'react';

export interface PostPreviewProps {
  platform: string;
  content: string;
  personaName: string;
  personaRole: string;
  charLimit: number;
}

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  twitter: 280,
  linkedin: 3000,
  bluesky: 300,
  threads: 500,
  mastodon: 500,
};

const PLATFORM_CONFIG: Record<
  string,
  {
    label: string;
    icon: string;
    accentColor: string;
    cardBg: string;
    headerBg: string;
    handle?: string;
  }
> = {
  linkedin: {
    label: 'LinkedIn',
    icon: 'in',
    accentColor: '#0A66C2',
    cardBg: 'bg-[#1B2730]',
    headerBg: 'bg-[#0A66C2]',
    handle: undefined,
  },
  x: {
    label: '',
    icon: '\ud835\udd4f',
    accentColor: '#000000',
    cardBg: 'bg-[#16181C]',
    headerBg: 'bg-black',
    handle: '@nirarazi',
  },
  twitter: {
    label: '',
    icon: '\ud835\udd4f',
    accentColor: '#000000',
    cardBg: 'bg-[#16181C]',
    headerBg: 'bg-black',
    handle: '@nirarazi',
  },
  bluesky: {
    label: 'Bluesky',
    icon: '\ud83e\udd8b',
    accentColor: '#0085FF',
    cardBg: 'bg-[#161E27]',
    headerBg: 'bg-[#0085FF]',
    handle: '@nir.bsky.social',
  },
  threads: {
    label: 'Threads',
    icon: '@',
    accentColor: '#000000',
    cardBg: 'bg-[#181818]',
    headerBg: 'bg-[#333333]',
    handle: '@nirarazi',
  },
  mastodon: {
    label: 'Mastodon',
    icon: 'M',
    accentColor: '#6364FF',
    cardBg: 'bg-[#1F1A2E]',
    headerBg: 'bg-[#6364FF]',
    handle: '@nir@mastodon.social',
  },
};

function getCharCountColor(length: number, limit: number): string {
  const ratio = length / limit;
  if (ratio < 0.8) return 'bg-green-500';
  if (ratio < 0.95) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getCharCountTextColor(length: number, limit: number): string {
  const ratio = length / limit;
  if (ratio < 0.8) return 'text-green-400';
  if (ratio < 0.95) return 'text-yellow-400';
  return 'text-red-400';
}

const LinkedInPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  personaRole,
  charLimit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const truncateAt = 500;
  const shouldTruncate = content.length > truncateAt;
  const displayContent =
    shouldTruncate && !expanded ? content.slice(0, truncateAt) : content;

  return (
    <div className="bg-[#1B2730] rounded-lg overflow-hidden border border-[#38444D]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#38444D]">
        <span
          className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: '#0A66C2' }}
        >
          in
        </span>
        <span className="text-xs font-medium text-gray-400">LinkedIn</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: '#0A66C2' }}
          >
            {personaName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {personaName}
            </span>
            <span className="text-xs text-gray-400">{personaRole}</span>
            <span className="text-xs text-gray-500">Just now &middot; \ud83c\udf10</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {displayContent}
          {shouldTruncate && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-gray-400 hover:text-white ml-1 text-sm"
            >
              ...see more
            </button>
          )}
          {shouldTruncate && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-white ml-1 text-sm block mt-1"
            >
              show less
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#38444D] text-xs text-gray-400">
          <span className="hover:text-white cursor-default">\ud83d\udc4d Like</span>
          <span className="hover:text-white cursor-default">\ud83d\udcac Comment</span>
          <span className="hover:text-white cursor-default">\ud83d\udd04 Repost</span>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const XPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div className="bg-[#16181C] rounded-lg overflow-hidden border border-[#2F3336]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2F3336]">
        <span className="text-sm font-bold text-white">{'\ud835\udd4f'}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-gray-700 shrink-0">
            {personaName.charAt(0)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {personaName}
            </span>
            <span className="text-sm text-gray-500">@nirarazi</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        <div className="flex items-center gap-8 mt-4 pt-3 border-t border-[#2F3336] text-xs text-gray-500">
          <span className="hover:text-sky-400 cursor-default">\ud83d\udcac</span>
          <span className="hover:text-green-400 cursor-default">\ud83d\udd04</span>
          <span className="hover:text-pink-400 cursor-default">\u2764\ufe0f</span>
          <span className="hover:text-sky-400 cursor-default">\ud83d\udcca</span>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const BlueskyPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div className="bg-[#161E27] rounded-lg overflow-hidden border border-[#2A3A4A]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2A3A4A]">
        <span className="text-sm">{'\ud83e\udd8b'}</span>
        <span className="text-xs font-medium text-gray-400">Bluesky</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: '#0085FF' }}
          >
            {personaName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {personaName}
            </span>
            <span className="text-xs text-gray-500">@nir.bsky.social</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        <div className="flex items-center gap-8 mt-4 pt-3 border-t border-[#2A3A4A] text-xs text-gray-500">
          <span className="hover:text-sky-400 cursor-default">\ud83d\udcac</span>
          <span className="hover:text-green-400 cursor-default">\ud83d\udd04</span>
          <span className="hover:text-pink-400 cursor-default">\u2764\ufe0f</span>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const MastodonPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div className="bg-[#1F1A2E] rounded-lg overflow-hidden border border-[#3D3557]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#3D3557]">
        <span
          className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: '#6364FF' }}
        >
          M
        </span>
        <span className="text-xs font-medium text-gray-400">Mastodon</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: '#6364FF' }}
          >
            {personaName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {personaName}
            </span>
            <span className="text-xs text-gray-500">@nir@mastodon.social</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        <div className="flex items-center gap-8 mt-4 pt-3 border-t border-[#3D3557] text-xs text-gray-500">
          <span className="hover:text-sky-400 cursor-default">\ud83d\udcac</span>
          <span className="hover:text-green-400 cursor-default">\ud83d\udd04</span>
          <span className="hover:text-pink-400 cursor-default">\u2764\ufe0f</span>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const ThreadsPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div className="bg-[#181818] rounded-lg overflow-hidden border border-[#333333]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#333333]">
        <span className="text-sm font-bold text-white">@</span>
        <span className="text-xs font-medium text-gray-400">Threads</span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-gray-700 shrink-0">
            {personaName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {personaName}
            </span>
            <span className="text-xs text-gray-500">@nirarazi</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        <div className="flex items-center gap-8 mt-4 pt-3 border-t border-[#333333] text-xs text-gray-500">
          <span className="hover:text-pink-400 cursor-default">\u2764\ufe0f</span>
          <span className="hover:text-sky-400 cursor-default">\ud83d\udcac</span>
          <span className="hover:text-green-400 cursor-default">\ud83d\udd04</span>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const GenericPreview: FC<PostPreviewProps> = ({
  platform,
  content,
  personaName,
  personaRole,
  charLimit,
}) => {
  return (
    <div className="bg-newBgColorInner rounded-lg overflow-hidden border border-fifth">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-fifth">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-gray-600 text-[10px] font-bold text-white">
          {(platform || '?').charAt(0).toUpperCase()}
        </span>
        <span className="text-xs font-medium text-gray-400">
          {platform || 'Unknown'}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-gray-600 shrink-0">
            {personaName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {personaName}
            </span>
            <span className="text-xs text-gray-400">{personaRole}</span>
          </div>
        </div>

        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} />
    </div>
  );
};

const CharCountBar: FC<{ length: number; limit: number }> = ({
  length,
  limit,
}) => {
  const ratio = Math.min(length / limit, 1);
  const barColor = getCharCountColor(length, limit);
  const textColor = getCharCountTextColor(length, limit);

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className={`text-xs mt-1.5 text-right ${textColor}`}>
        {length.toLocaleString()} / {limit.toLocaleString()} chars
      </div>
    </div>
  );
};

export const PostPreview: FC<PostPreviewProps> = (props) => {
  const platform = props.platform?.toLowerCase() || '';

  switch (platform) {
    case 'linkedin':
      return <LinkedInPreview {...props} />;
    case 'x':
    case 'twitter':
      return <XPreview {...props} />;
    case 'bluesky':
      return <BlueskyPreview {...props} />;
    case 'mastodon':
      return <MastodonPreview {...props} />;
    case 'threads':
      return <ThreadsPreview {...props} />;
    default:
      return <GenericPreview {...props} />;
  }
};

export { PLATFORM_CHAR_LIMITS };
