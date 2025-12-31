'use client';

import { useState, useEffect } from 'react';
import type { Chapter, NovelRecord, ConversationMessage } from '../../../../types/db';

interface ChapterWithNovels {
  id: number;
  name: string;
  novels: NovelRecord[];
  expanded: boolean;
}

interface NovelGenerationComponentProps {
  chapter: Partial<Chapter> | null;
  chapterId: string;
  userId: string;
  worldContext: {worldview?: string; master_sitting?: string; main_characters?: any;} | null;
  novels: NovelRecord[];
  messages: ConversationMessage[];
  onNovelsChange: (novels: NovelRecord[]) => void;
  worldId?: number;
}

export default function NovelGenerationComponent({
  chapter,
  chapterId,
  userId,
  worldContext,
  novels,
  messages,
  onNovelsChange,
  worldId
}: NovelGenerationComponentProps) {
  const [generatingStory, setGeneratingStory] = useState<boolean>(false);
  const [generateStoryError, setGenerateStoryError] = useState<string | null>(null);
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const [isNovelModalOpen, setIsNovelModalOpen] = useState<boolean>(false);
  
  const [isChapterSelectorOpen, setIsChapterSelectorOpen] = useState<boolean>(false);
  const [chaptersWithNovels, setChaptersWithNovels] = useState<ChapterWithNovels[]>([]);
  const [selectedHistoryChapterId, setSelectedHistoryChapterId] = useState<number | null>(null);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(false);

  const openNovelModal = (novel: NovelRecord) => {
    setSelectedNovel(novel);
    setIsNovelModalOpen(true);
  };

  const closeNovelModal = () => {
    setIsNovelModalOpen(false);
    setSelectedNovel(null);
  };

  const openChapterSelector = async () => {
    if (!worldId) {
      alert('无法获取世界ID');
      return;
    }
    
    setIsChapterSelectorOpen(true);
    setLoadingChapters(true);
    
    try {
      const chaptersRes = await fetch(`/api/db/worlds/${worldId}/chapters`);
      if (!chaptersRes.ok) throw new Error('获取章节列表失败');
      
      const chapters = await chaptersRes.json();
      
      const chaptersWithNovelsData: ChapterWithNovels[] = await Promise.all(
        chapters.map(async (ch: any) => {
          const novelsRes = await fetch(`/api/db/chapters/${ch.id}/novels`);
          const novels = novelsRes.ok ? await novelsRes.json() : [];
          return {
            id: ch.id,
            name: ch.name,
            novels,
            expanded: false
          };
        })
      );
      
      setChaptersWithNovels(chaptersWithNovelsData);
    } catch (e) {
      console.error('获取章节列表失败:', e);
      alert('获取章节列表失败');
    } finally {
      setLoadingChapters(false);
    }
  };

  const closeChapterSelector = () => {
    setIsChapterSelectorOpen(false);
    setSelectedHistoryChapterId(null);
  };

  const toggleChapterExpanded = (chapterId: number) => {
    setChaptersWithNovels(prev =>
      prev.map(ch =>
        ch.id === chapterId ? { ...ch, expanded: !ch.expanded } : ch
      )
    );
  };

  const selectHistoryChapter = (novelId: number) => {
    setSelectedHistoryChapterId(novelId);
  };

  const generateStoryWithHistory = async () => {
    closeChapterSelector();
    await generateStory(selectedHistoryChapterId);
  };

  const sortByIdAsc = (arr: ConversationMessage[]) =>
    arr.slice().sort((a, b) => {
      const aTemp = a.id < 0;
      const bTemp = b.id < 0;
      if (aTemp && !bTemp) return 1;
      if (!aTemp && bTemp) return -1;
      return a.id - b.id;
    });

  const generateStory = async (historyChapterId: number | null = null) => {
    if (generatingStory) return;
    setGeneratingStory(true);
    setGenerateStoryError(null);
    
    try {
      console.log('=== 开始生成故事 ===');
      console.log('worldContext:', worldContext);
      console.log('chapter:', chapter);
      console.log('historyChapterId:', historyChapterId);
      
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
        history_chapter_id: historyChapterId ? String(historyChapterId) : null
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

  const ChapterSelectorModal = () => {
    if (!isChapterSelectorOpen) return null;

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
        onClick={closeChapterSelector}
      >
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
              选择历史章节
            </h2>
            <button
              onClick={closeChapterSelector}
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
          
          {loadingChapters ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              加载中...
            </div>
          ) : chaptersWithNovels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              暂无章节
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chaptersWithNovels.map((ch) => (
                <div key={ch.id} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => toggleChapterExpanded(ch.id)}
                  >
                    <span style={{ fontWeight: 500, color: '#111827' }}>{ch.name}</span>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>
                      {ch.expanded ? '▼' : '▶'} ({ch.novels.length} 个故事)
                    </span>
                  </div>
                  
                  {ch.expanded && (
                    <div style={{ padding: '8px 0' }}>
                      {ch.novels.length === 0 ? (
                        <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '14px' }}>
                          暂无故事
                        </div>
                      ) : (
                        ch.novels.map((novel) => (
                          <div
                            key={novel.id}
                            style={{
                              padding: '10px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectHistoryChapter(novel.id);
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f9ff';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                            }}
                          >
                            <input
                              type="radio"
                              name="historyChapter"
                              checked={selectedHistoryChapterId === novel.id}
                              readOnly
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>
                                {novel.title || '未命名故事'}
                              </div>
                              <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                                {new Date(novel.create_time).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button
              onClick={closeChapterSelector}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              取消
            </button>
            <button
              onClick={generateStoryWithHistory}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              开始生成
            </button>
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
          onClick={openChapterSelector}
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
      <ChapterSelectorModal />
    </>
  );
}
