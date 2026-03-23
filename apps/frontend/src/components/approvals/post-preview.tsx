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

function getCharBarColor(length: number, limit: number): string {
  const ratio = length / limit;
  if (ratio < 0.8) return '#22c55e';
  if (ratio < 0.95) return '#eab308';
  return '#ef4444';
}

// ─── LinkedIn ────────────────────────────────────────────────────
// Light mode, white card, #0a66c2 accent, system-ui font
const LinkedInPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  personaRole,
  charLimit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const truncateAt = 480;
  const shouldTruncate = content.length > truncateAt;
  const displayContent =
    shouldTruncate && !expanded ? content.slice(0, truncateAt) : content;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          backgroundColor: '#f9fafb',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#666666',
            letterSpacing: 0.3,
          }}
        >
          LINKEDIN PREVIEW
        </span>
      </div>

      {/* Post body */}
      <div style={{ padding: '12px 16px' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#0a66c2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#191919',
                lineHeight: '20px',
              }}
            >
              {personaName}
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#666666',
                lineHeight: '16px',
              }}
            >
              {personaRole}
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#999999',
                lineHeight: '16px',
              }}
            >
              Just now &middot; 🌐
            </span>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: 14,
            color: '#191919',
            lineHeight: '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {displayContent}
          {shouldTruncate && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                color: '#666666',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginLeft: 2,
              }}
            >
              ...see more
            </button>
          )}
          {shouldTruncate && expanded && (
            <button
              onClick={() => setExpanded(false)}
              style={{
                color: '#666666',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'block',
                marginTop: 4,
              }}
            >
              show less
            </button>
          )}
        </div>

        {/* Engagement bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 12,
            paddingTop: 8,
            borderTop: '1px solid #e8e8e8',
          }}
        >
          {[
            { icon: '👍', label: 'Like' },
            { icon: '💬', label: 'Comment' },
            { icon: '🔄', label: 'Repost' },
            { icon: '📤', label: 'Send' },
          ].map((a) => (
            <div
              key={a.label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                color: '#666666',
                cursor: 'default',
              }}
            >
              <span style={{ fontSize: 14 }}>{a.icon}</span>
              {a.label}
            </div>
          ))}
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light />
    </div>
  );
};

// ─── X / Twitter ─────────────────────────────────────────────────
// Dark mode, #000 bg, #e7e9ea text, Inter-like font
const XPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div
      style={{
        fontFamily:
          '"TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: '#000000',
        borderRadius: 8,
        border: '1px solid #2f3336',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #2f3336',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 800, color: '#e7e9ea' }}>
          𝕏
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#71767b',
            letterSpacing: 0.3,
          }}
        >
          POST PREVIEW
        </span>
      </div>

      {/* Post */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#333639',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e7e9ea',
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#e7e9ea',
                }}
              >
                {personaName}
              </span>
              <span style={{ fontSize: 15, color: '#71767b' }}>
                @nirarazi &middot; now
              </span>
            </div>
            <div
              style={{
                fontSize: 15,
                color: '#e7e9ea',
                lineHeight: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </div>

            {/* Engagement */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
                maxWidth: 300,
              }}
            >
              {['💬', '🔄', '❤️', '📊', '📤'].map((icon, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 13,
                    color: '#71767b',
                    cursor: 'default',
                  }}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light={false} />
    </div>
  );
};

// ─── Bluesky ─────────────────────────────────────────────────────
// Light mode, white bg, #0085ff accent
const BlueskyPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          backgroundColor: '#f0f7ff',
        }}
      >
        <span style={{ fontSize: 14 }}>🦋</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#0085ff',
            letterSpacing: 0.3,
          }}
        >
          BLUESKY PREVIEW
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: '#0085ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                {personaName}
              </span>
              <span style={{ fontSize: 13, color: '#888888' }}>
                @nir.bsky.social
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#2a2a2a',
                lineHeight: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 12,
                paddingTop: 8,
              }}
            >
              {['💬', '🔄', '❤️'].map((icon, i) => (
                <span
                  key={i}
                  style={{ fontSize: 13, color: '#888888', cursor: 'default' }}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light />
    </div>
  );
};

// ─── Threads ─────────────────────────────────────────────────────
// Light mode (Threads default is light), #000 text, clean minimal
const ThreadsPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          backgroundColor: '#fafafa',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: '#000000' }}>
          @
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#999999',
            letterSpacing: 0.3,
          }}
        >
          THREADS PREVIEW
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#000000' }}>
                {personaName}
              </span>
              <span style={{ fontSize: 13, color: '#999999' }}>now</span>
            </div>
            <div
              style={{
                fontSize: 15,
                color: '#000000',
                lineHeight: '21px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 12,
              }}
            >
              {['❤️', '💬', '🔄', '📤'].map((icon, i) => (
                <span
                  key={i}
                  style={{ fontSize: 13, color: '#999999', cursor: 'default' }}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light />
    </div>
  );
};

// ─── Mastodon ────────────────────────────────────────────────────
// Dark mode (Mastodon default), #282c37 bg, #6364ff accent
const MastodonPreview: FC<PostPreviewProps> = ({
  content,
  personaName,
  charLimit,
}) => {
  return (
    <div
      style={{
        fontFamily:
          '"Mastodon", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#282c37',
        borderRadius: 8,
        border: '1px solid #393f4f',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #393f4f',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: '#6364ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          M
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#9baec8',
            letterSpacing: 0.3,
          }}
        >
          MASTODON PREVIEW
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 4,
              backgroundColor: '#6364ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                {personaName}
              </span>
              <br />
              <span style={{ fontSize: 13, color: '#9baec8' }}>
                @nir@mastodon.social
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#d9e1e8',
                lineHeight: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginTop: 12,
              }}
            >
              {['💬', '🔄', '⭐'].map((icon, i) => (
                <span
                  key={i}
                  style={{ fontSize: 13, color: '#9baec8', cursor: 'default' }}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light={false} />
    </div>
  );
};

// ─── Generic fallback ────────────────────────────────────────────
const GenericPreview: FC<PostPreviewProps> = ({
  platform,
  content,
  personaName,
  personaRole,
  charLimit,
}) => {
  return (
    <div
      style={{
        fontFamily: '-apple-system, system-ui, sans-serif',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#eeeeee',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: '#888',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {(platform || '?').charAt(0).toUpperCase()}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: 0.3 }}>
          {(platform || 'UNKNOWN').toUpperCase()} PREVIEW
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {personaName.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{personaName}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{personaRole}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#333',
            lineHeight: '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>

      <CharCountBar length={content.length} limit={charLimit} light />
    </div>
  );
};

// ─── Character count bar ─────────────────────────────────────────
const CharCountBar: FC<{ length: number; limit: number; light?: boolean }> = ({
  length,
  limit,
  light = true,
}) => {
  const ratio = Math.min(length / limit, 1);
  const barColor = getCharBarColor(length, limit);
  const trackBg = light ? '#e5e7eb' : 'rgba(255,255,255,0.1)';
  const textColor = light ? '#666666' : '#9ca3af';

  return (
    <div style={{ padding: '4px 16px 12px' }}>
      <div
        style={{
          width: '100%',
          height: 3,
          backgroundColor: trackBg,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${ratio * 100}%`,
            backgroundColor: barColor,
            borderRadius: 2,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: textColor,
          textAlign: 'right',
          marginTop: 4,
        }}
      >
        {length.toLocaleString()} / {limit.toLocaleString()} chars
      </div>
    </div>
  );
};

// ─── Router ──────────────────────────────────────────────────────
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
