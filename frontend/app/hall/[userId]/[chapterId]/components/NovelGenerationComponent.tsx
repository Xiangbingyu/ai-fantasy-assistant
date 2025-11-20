'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { Chapter, NovelRecord, ConversationMessage } from '../../../../types/db';

interface NovelGenerationComponentProps {
  chapter: Partial<Chapter> | null;
  chapterId: string;
  userId: string;
  worldContext: {worldview?: string; master_sitting?: string; main_characters?: any;} | null;
  novels: NovelRecord[];
  messages: ConversationMessage[];
  onNovelsChange: (novels: NovelRecord[]) => void;
  socket: Socket | null;
  isConnected: boolean;
}

export default function NovelGenerationComponent({
  chapter,
  chapterId,
  userId,
  worldContext,
  novels,
  messages,
  onNovelsChange,
  socket,
  isConnected
}: NovelGenerationComponentProps) {
  const [generatingStory, setGeneratingStory] = useState<boolean>(false);
  const [generateStoryError, setGenerateStoryError] = useState<string | null>(null);
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const [isNovelModalOpen, setIsNovelModalOpen] = useState<boolean>(false);
  
  // 异步任务相关状态
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [taskProgress, setTaskProgress] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const openNovelModal = (novel: NovelRecord) => {
    setSelectedNovel(novel);
    setIsNovelModalOpen(true);
  };

  const closeNovelModal = () => {
    setIsNovelModalOpen(false);
    setSelectedNovel(null);
  };

  // 清理轮询
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollingInterval(null);
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await fetch(`/api/novel/status/${taskId}`);
      const data = await res.json();
      
      if (res.ok) {
        setTaskStatus(data.status);
        
        if (data.status === 'completed' && data.result) {
          // 任务完成，保存故事
          const title = (data.result.split('\n').find((line: string) => line.trim().length) || 'AI故事').slice(0, 50);
          
          const saveRes = await fetch(`/api/db/chapters/${chapterId}/novels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: Number(userId),
              title,
              content: data.result,
            }),
          });
          
          if (saveRes.ok) {
            const saved = await saveRes.json();
            onNovelsChange([saved, ...novels]);
          }
          
          clearPolling();
          setGeneratingStory(false);
          setCurrentTaskId(null);
          setTaskStatus(null);
          setTaskProgress('');
        } else if (data.status === 'failed') {
          setGenerateStoryError(data.error || '生成故事失败');
          clearPolling();
          setGeneratingStory(false);
          setCurrentTaskId(null);
          setTaskStatus(null);
          setTaskProgress('');
        }
      }
    } catch (e) {
      console.error('轮询任务状态失败:', e);
    }
  };

  // WebSocket事件监听
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNovelProgress = (data: any) => {
      if (data.task_id === currentTaskId) {
        setTaskProgress(data.message);
        if (data.status) {
          setTaskStatus(data.status);
        }
      }
    };

    const handleNovelComplete = (data: any) => {
      if (data.task_id === currentTaskId) {
        setTaskProgress('故事生成完成！');
        setTaskStatus('completed');
        clearPolling();
        
        // 保存故事
        const title = (data.result.split('\n').find((line: string) => line.trim().length) || 'AI故事').slice(0, 50);
        
        fetch(`/api/db/chapters/${chapterId}/novels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: Number(userId),
            title,
            content: data.result,
          }),
        }).then(async (saveRes) => {
          if (saveRes.ok) {
            const saved = await saveRes.json();
            onNovelsChange([saved, ...novels]);
          }
        }).finally(() => {
          setGeneratingStory(false);
          setCurrentTaskId(null);
          setTaskStatus(null);
          setTaskProgress('');
        });
      }
    };

    const handleNovelError = (data: any) => {
      if (data.task_id === currentTaskId) {
        setGenerateStoryError(data.error || '生成故事失败');
        clearPolling();
        setGeneratingStory(false);
        setCurrentTaskId(null);
        setTaskStatus(null);
        setTaskProgress('');
      }
    };

    socket.on('novel_progress', handleNovelProgress);
    socket.on('novel_complete', handleNovelComplete);
    socket.on('novel_error', handleNovelError);

    return () => {
      socket.off('novel_progress', handleNovelProgress);
      socket.off('novel_complete', handleNovelComplete);
      socket.off('novel_error', handleNovelError);
    };
  }, [socket, isConnected, currentTaskId, chapterId, userId, novels, onNovelsChange]);

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

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
    setTaskProgress('正在提交任务...');
    setTaskStatus('pending');
    
    try {
      const msgRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const msgs = (await msgRes.json()) as ConversationMessage[];
      if (!msgRes.ok) throw new Error('获取消息失败');

      const canonical = msgs.filter((m) => m.id > 0);
      const ordered = sortByIdAsc(canonical);
      const prompt = ordered.map((m) => m.content).join('\n');

      // 提交异步任务
      const novelRes = await fetch(`/api/novel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
        }),
      });
      
      const novelData = await novelRes.json();
      if (!novelRes.ok) {
        const msg =
          typeof novelData?.error === 'string'
            ? novelData.error
            : novelData?.error?.message || '提交任务失败';
        throw new Error(msg);
      }

      const taskId = novelData.task_id;
      if (!taskId) throw new Error('未获取到任务ID');

      setCurrentTaskId(taskId);
      setTaskProgress('任务已提交，正在生成故事...');
      setTaskStatus('processing');

      // 启动轮询
      pollingIntervalRef.current = setInterval(() => {
        pollTaskStatus(taskId);
      }, 2000);
      setPollingInterval(pollingIntervalRef.current);

    } catch (e) {
      setGenerateStoryError(e instanceof Error ? e.message : '生成故事异常');
      setGeneratingStory(false);
      setTaskStatus(null);
      setTaskProgress('');
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
        
        {/* 任务进度显示 */}
        {generatingStory && taskProgress && (
          <div style={{ 
            marginTop: 8, 
            padding: '8px 12px', 
            borderRadius: 6, 
            backgroundColor: '#f0f9ff', 
            border: '1px solid #3b82f6',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: taskStatus === 'processing' ? '#3b82f6' : '#6b7280',
                animation: taskStatus === 'processing' ? 'pulse 1.5s infinite' : 'none'
              }}></div>
              <span>{taskProgress}</span>
            </div>
            {taskStatus === 'processing' && (
              <div style={{ 
                marginTop: 4, 
                fontSize: '12px', 
                color: '#6b7280' 
              }}>
                任务ID: {currentTaskId}
              </div>
            )}
          </div>
        )}
        
        {generateStoryError && (
          <div style={{ color: '#ef4444', marginTop: 8 }}>{generateStoryError}</div>
        )}
      </section>
      <NovelDetailModal />
    </>
  );
}