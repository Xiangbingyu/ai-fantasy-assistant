'use client';

import { useState } from 'react';
import type { Chapter, NovelRecord, ConversationMessage } from '../../../../types/db';

interface NovelGenerationComponentProps {
  chapter: Partial<Chapter> | null;
  chapterId: string;
  userId: string;
  worldContext: {worldview?: string; master_sitting?: string; main_characters?: any;} | null;
  novels: NovelRecord[];
  messages: ConversationMessage[];
  onNovelsChange: (novels: NovelRecord[]) => void;
}

export default function NovelGenerationComponent({
  chapter,
  chapterId,
  userId,
  worldContext,
  novels,
  messages,
  onNovelsChange
}: NovelGenerationComponentProps) {
  const [generatingStory, setGeneratingStory] = useState<boolean>(false);
  const [generateStoryError, setGenerateStoryError] = useState<string | null>(null);
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const [isNovelModalOpen, setIsNovelModalOpen] = useState<boolean>(false);

  const openNovelModal = (novel: NovelRecord) => {
    setSelectedNovel(novel);
    setIsNovelModalOpen(true);
  };

  const closeNovelModal = () => {
    setIsNovelModalOpen(false);
    setSelectedNovel(null);
  };

  const sortByIdAsc = (arr: ConversationMessage[]) =>
    arr.slice().sort((a, b) => {
      const aTemp = a.id < 0;
      const bTemp = b.id < 0;
      if (aTemp && !bTemp) return 1;
      if (!aTemp && bTemp) return -1;
      return a.id - b.id;
    });

  const handleGenerateStory = async () => {
    if (generatingStory) return;
    setGeneratingStory(true);
    setGenerateStoryError(null);
    
    try {
      console.log('=== 开始生成故事 ===');
      console.log('worldContext:', worldContext);
      console.log('chapter:', chapter);
      
      const msgRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const msgs = (await msgRes.json()) as ConversationMessage[];
      if (!msgRes.ok) throw new Error('获取消息失败');

      const canonical = msgs.filter((m) => m.id > 0);
      const ordered = sortByIdAsc(canonical);
      const prompt = ordered.map((m) => m.content).join('\n');

      console.log('prompt内容:', prompt);
      console.log('prompt长度:', prompt.length);

      const requestData = {
        chapter_id: Number(chapterId),
        user_id: Number(userId),
        title: 'AI生成故事',
        prompt,
        worldview: worldContext?.worldview || '',
        master_sitting: worldContext?.master_sitting || '',
        main_characters: worldContext?.main_characters || [],
        background: chapter?.background || '',
        history_chapter_id: null
      };

      console.log('发送小说生成请求:', JSON.stringify(requestData, null, 2));

      const novelRes = await fetch(`/api/novel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      const novelData = await novelRes.json();
      console.log('小说生成响应:', novelData);
      
      if (!novelRes.ok) {
        const msg =
          typeof novelData?.error === 'string'
            ? novelData.error
            : novelData?.error?.message || '生成故事失败';
        throw new Error(msg);
      }

      if (novelData.status === 'completed') {
        const fetchRes = await fetch(`/api/db/chapters/${chapterId}/novels`);
        if (fetchRes.ok) {
          const updatedNovels = await fetchRes.json();
          onNovelsChange(updatedNovels);
        }
      } else {
        throw new Error(novelData.error || '生成故事失败');
      }

      setGeneratingStory(false);

    } catch (e) {
      console.error('生成故事失败:', e);
      setGenerateStoryError(e instanceof Error ? e.message : '生成故事异常');
      setGeneratingStory(false);
    }
  };

  const NovelDetailModal = () => {
    if (!isNovelModalOpen || !selectedNovel) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={closeNovelModal}
      >
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
              {selectedNovel.title || '未命名故事'}
            </h2>
            <button
              onClick={closeNovelModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
              }}
            >
              &times;
            </button>
          </div>
          
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
            创建时间: {new Date(selectedNovel.create_time).toLocaleString()}
          </div>
          
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#111827' }}>
            {selectedNovel.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>故事集</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {novels.length === 0 ? (
            <div style={{ color: '#6b7280' }}>暂无故事记录</div>
          ) : (
            novels.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => openNovelModal(n)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#93c5fd';
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f9ff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fff';
                }}
              >
                <div style={{ fontWeight: 500 }}>{n.title || '未命名故事'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(n.create_time).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={handleGenerateStory}
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: generatingStory ? '#f3f4f6' : '#f9fafb',
            cursor: generatingStory ? 'not-allowed' : 'pointer',
            color: generatingStory ? '#9ca3af' : '#374151',
          }}
          disabled={generatingStory}
        >
          {generatingStory ? '生成中...' : '生成故事'}
        </button>
        
        {generateStoryError && (
          <div style={{ color: '#ef4444', marginTop: 8 }}>{generateStoryError}</div>
        )}
      </section>
      <NovelDetailModal />
    </>
  );
}
