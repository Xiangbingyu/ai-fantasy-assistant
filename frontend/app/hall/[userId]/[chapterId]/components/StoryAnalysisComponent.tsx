'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Chapter, ConversationMessage } from '../../../../types/db';

interface StoryAnalysisComponentProps {
  chapter: Partial<Chapter> | null;
  chapterId: string;
  worldContext: {worldview?: string; master_sitting?: string; main_characters?: any;} | null;
  messages: ConversationMessage[];
  lastAnalysisCount: number;
  onLastAnalysisCountChange: (count: number) => void;
  onStoryAnalysisChange: (analysis: string) => void;
  onStoryAnalysisExpose?: (analysis: string) => void;
}

export default function StoryAnalysisComponent({
  chapter,
  chapterId,
  worldContext,
  messages,
  lastAnalysisCount,
  onLastAnalysisCountChange,
  onStoryAnalysisChange,
  onStoryAnalysisExpose
}: StoryAnalysisComponentProps) {
  const [storyAnalysis, setStoryAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const sortByIdAsc = (arr: ConversationMessage[]) =>
    arr.slice().sort((a, b) => {
      const aTemp = a.id < 0;
      const bTemp = b.id < 0;
      if (aTemp && !bTemp) return 1;
      if (!aTemp && bTemp) return -1;
      return a.id - b.id;
    });

  const analyzeCurrentStory = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      if (!histRes.ok) {
        throw new Error('获取消息失败');
      }
      const canonical = allMsgs.filter((m) => m.id > 0);
      const ordered = sortByIdAsc(canonical);
      const history = ordered.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      const analyzeRes = await fetch(`/api/chat/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          worldview: worldContext?.worldview,
          master_sitting: worldContext?.master_sitting,
          main_characters: worldContext?.main_characters,
          background: chapter?.background,
        }),
      });
      
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(analyzeData?.error || '剧情分析失败');
      }

      const newAnalysis = analyzeData?.analysis || '';
      setStoryAnalysis(newAnalysis);
      onStoryAnalysisChange(newAnalysis);
      if (onStoryAnalysisExpose) {
        onStoryAnalysisExpose(newAnalysis);
      }
      
      const count = ordered.length;
      const roundedCount = Math.floor(count / 10) * 10;
      const newLastAnalysisCount = roundedCount > 0 ? roundedCount : count;
      onLastAnalysisCountChange(newLastAnalysisCount);
      
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : '分析异常');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    const currentRound = Math.floor(messages.length / 10) * 10;
    const nextRound = currentRound + 10;

    const shouldTriggerAnalysis = 
      messages.length > 10 && 
      !analysisLoading &&
      (lastAnalysisCount === 0 || 
       (messages.length > currentRound + 1 && messages.length < nextRound && currentRound > lastAnalysisCount) || 
       messages.length < lastAnalysisCount);
    
    if (shouldTriggerAnalysis) {
      setTimeout(() => analyzeCurrentStory(), 1000);
    }
  }, [messages.length, lastAnalysisCount, analysisLoading]);

  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>目前剧情分析</div>
      {analysisLoading ? (
        <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
          正在分析当前剧情发展...
        </div>
      ) : analysisError ? (
        <div style={{ whiteSpace: 'pre-wrap', color: '#ef4444', fontSize: 14, lineHeight: 1.5 }}>
          {analysisError}
        </div>
      ) : storyAnalysis ? (
        <div style={{ whiteSpace: 'pre-wrap', color: '#111827', fontSize: 14, lineHeight: 1.5, maxHeight: '400px', overflowY: 'auto' }}>
          {storyAnalysis}
        </div>
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
          对话达到10轮后将自动进行剧情分析
        </div>
      )}
    </section>
  );
}