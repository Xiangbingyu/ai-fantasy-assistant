'use client';

import { useState } from 'react';

interface AutoPlayComponentProps {
  onPlay?: () => void;
  onPause?: () => void;
  isPlaying?: boolean;
}

export default function AutoPlayComponent({
  onPlay,
  onPause,
  isPlaying = false
}: AutoPlayComponentProps) {
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  const handlePlay = () => {
    setLocalIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    setLocalIsPlaying(false);
    onPause?.();
  };

  const playing = isPlaying || localIsPlaying;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          marginBottom: 12,
        }}
      >
        自动播放
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: playing ? '#f3f4f6' : '#ffffff',
            color: playing ? '#9ca3af' : '#111827',
            cursor: playing ? 'not-allowed' : 'pointer',
            transition: 'all 120ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          title="开始自动播放"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          播放
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!playing}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: !playing ? '#f3f4f6' : '#ffffff',
            color: !playing ? '#9ca3af' : '#111827',
            cursor: !playing ? 'not-allowed' : 'pointer',
            transition: 'all 120ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          title="暂停自动播放"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          暂停
        </button>
      </div>
    </div>
  );
}
