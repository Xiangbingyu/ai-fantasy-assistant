'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import type { Chapter, ConversationMessage, NovelRecord } from '../../../types/db';
import WorldPanelComponent from './components/WorldPanelComponent';
import NovelGenerationComponent from './components/NovelGenerationComponent';
import AutoPlayComponent from './components/AutoPlayComponent';
import StoryAnalysisComponent from './components/StoryAnalysisComponent';
import StoryGuideComponent from './components/StoryGuideComponent';
import SuggestionsComponent from './components/SuggestionsComponent';

export default function ChapterPage() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const params = useParams<{ userId: string; chapterId: string }>();
  const userId = params.userId;
  const chapterId = params.chapterId;
  
  const [isMobile, setIsMobile] = useState(false);
  const [activePanel, setActivePanel] = useState<'left' | 'suggestion' | 'right' | null>(null);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  const closePanel = () => {
    setActivePanel(null);
  };
  
  const togglePanel = (panel: 'left' | 'suggestion' | 'right') => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [worldContext, setWorldContext] = useState<{worldview?: string; master_sitting?: string; main_characters?: any;} | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const [isNovelModalOpen, setIsNovelModalOpen] = useState<boolean>(false);
  const [storyGuide, setStoryGuide] = useState<string>('');
  const [isSavingGuide, setIsSavingGuide] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayRef = useRef<boolean>(false);
  const [suggestions, setSuggestions] = useState<Array<{ content: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [tempIdSeq, setTempIdSeq] = useState<number>(-1);
  const [initializedInput, setInitializedInput] = useState<boolean>(false);
  const [lastAnalysisCount, setLastAnalysisCount] = useState<number>(0);
  const [storyAnalysis, setStoryAnalysis] = useState<string>('');
  const [currentStoryAnalysis, setCurrentStoryAnalysis] = useState<string>('');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sortByIdAsc = (arr: ConversationMessage[]) =>
    arr.slice().sort((a, b) => {
      const aTemp = a.id < 0;
      const bTemp = b.id < 0;
      if (aTemp && !bTemp) return 1;
      if (!aTemp && bTemp) return -1;
      return a.id - b.id;
    });

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });
    
    newSocket.on('chat_stream_data', (data) => {
      setStreamingMessage(prev => prev + data.content);
    });
    
    newSocket.on('chat_stream_end', () => {
      setIsStreaming(false);
    });
    
    newSocket.on('chat_stream_error', (error) => {
      console.error('Chat error:', error);
      setIsStreaming(false);
      setError(error.error || '聊天流式传输失败');
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addEmptyInputBubble = () => {
    const tempId = tempIdSeq;
    const placeholder: ConversationMessage = {
      id: tempId,
      chapter_id: Number(chapterId),
      user_id: Number(userId),
      role: 'user',
      content: '',
      create_time: new Date().toISOString(),
    };
    setMessages((prev) => sortByIdAsc([...prev, placeholder]));
    setEditingId(tempId);
    setEditText('');
    setTempIdSeq((prev) => prev - 1);
  };

  const runAutoPlayCycle = async () => {
    if (!autoPlayRef.current) return;

    try {
      const history = messages
        .filter((m) => m.id > 0 && m.content.trim())
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const chatData = {
        messages: history,
        worldview: worldContext?.worldview || '',
        master_sitting: worldContext?.master_sitting || '',
        main_characters: worldContext?.main_characters || '',
        background: chapter?.background || '',
        story_analysis: currentStoryAnalysis || '',
        story_guide: storyGuide || '',
        chapterId: chapterId,
        userId: userId
      };

      const aiCharacterRes = await fetch('/api/auto-chat/ai-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData),
      });

      if (!aiCharacterRes.ok) {
        throw new Error('AI角色扮演者接口调用失败');
      }

      const aiCharacterData = await aiCharacterRes.json();
      const aiCharacterContent = aiCharacterData.response;

      const aiCharacterMsg: ConversationMessage = {
        id: Date.now(),
        chapter_id: Number(chapterId),
        user_id: Number(userId),
        role: 'ai',
        content: aiCharacterContent,
        create_time: new Date().toISOString(),
      };

      setMessages((prev) => sortByIdAsc([...prev, aiCharacterMsg]));

      if (!autoPlayRef.current) return;

      const updatedHistory = [...history, { role: 'assistant', content: aiCharacterContent }];
      const updatedChatData = {
        ...chatData,
        messages: updatedHistory,
      };

      const aiUserRes = await fetch('/api/auto-chat/ai-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedChatData),
      });

      if (!aiUserRes.ok) {
        throw new Error('AI用户扮演者接口调用失败');
      }

      const aiUserData = await aiUserRes.json();
      const aiUserContent = aiUserData.response;

      const aiUserMsg: ConversationMessage = {
        id: Date.now() + 1,
        chapter_id: Number(chapterId),
        user_id: Number(userId),
        role: 'user',
        content: aiUserContent,
        create_time: new Date().toISOString(),
      };

      setMessages((prev) => sortByIdAsc([...prev, aiUserMsg]));

      if (autoPlayRef.current) {
        setTimeout(() => {
          runAutoPlayCycle();
        }, 1000);
      }
    } catch (error) {
      console.error('自动播放错误:', error);
      setIsAutoPlaying(false);
      autoPlayRef.current = false;
      addEmptyInputBubble();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadChapter = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}`);
        if (!res.ok) throw new Error('暂无章节详情接口');
        const data = await res.json();
        if (!cancelled) {
          setChapter(data as Chapter);
          const ctx = {
            worldview: (data as any).worldview,
            master_sitting: (data as any).master_sitting,
            main_characters: (data as any).main_characters,
          };
          setWorldContext(ctx);
        }
      } catch (e) {
        if (!cancelled) {
          setChapter({
            id: Number(chapterId),
            name: `章节 ${chapterId}`,
            background: '（暂未获取到背景信息）',
          });
          setWorldContext({
            worldview: undefined,
            master_sitting: undefined,
            main_characters: undefined,
          });
        }
      }
    };
    loadChapter();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/messages`);
        if (!res.ok) throw new Error('获取消息失败');
        const data = (await res.json()) as ConversationMessage[];
        if (!cancelled) setMessages(sortByIdAsc(data));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '获取消息异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    if (!loading && !error && !initializedInput) {
      addEmptyInputBubble();
      setInitializedInput(true);
    }
  }, [loading, error, initializedInput]);

  useEffect(() => {
    let cancelled = false;
    const loadNovels = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/novels`);
        if (!res.ok) throw new Error('获取小说失败');
        const data = (await res.json()) as NovelRecord[];
        if (!cancelled) setNovels(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadNovels();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const fetchSuggestions = async () => {
    if (editingId == null) return;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const editedMsg = messages.find((m) => m.id === editingId);
      const baseMsgs =
        editedMsg?.role === 'user' ? messages.filter((m) => m.id !== editingId) : messages;

      const canonical = baseMsgs.filter((m) => m.id > 0);
      const recent = sortByIdAsc(canonical).slice(Math.max(0, canonical.length - 10));
      const history = recent.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch(`/api/chat/suggestions`, {
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : data?.error?.message || '建议接口错误'
        );
      }

      // 处理新的function call格式返回数据
      // 从function调用参数中提取suggestions数据
      if (data && data.type === 'function' && 
          data.function && 
          data.function.name === 'generate_reply_suggestions' && 
          data.function.arguments) {
        try {
          // 确保arguments是字符串时进行解析
          const argumentsData = typeof data.function.arguments === 'string' 
            ? JSON.parse(data.function.arguments)
            : data.function.arguments;
          
          // 处理suggestion_1到suggestion_6字段的情况
          const suggestions = [];
          for (let i = 1; i <= 6; i++) {
            const key = `suggestion_${i}`;
            if (argumentsData[key] && typeof argumentsData[key] === 'string') {
              suggestions.push({ content: argumentsData[key] });
            }
          }
          setSuggestions(suggestions.length > 0 ? suggestions : []);
        } catch (e) {
          console.error('解析function call参数失败:', e);
          setSuggestions([]);
        }
      }
      // 兼容原有格式
      else if (Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions as Array<{ content: string }>);
      } 
      // 处理降级情况
      else if (typeof data?.raw === 'string') {
        setSuggestions([{ content: data.raw }]);
      } 
      // 默认情况
      else {
        setSuggestions([]);
      }
    } catch (e) {
      setSuggestionsError(e instanceof Error ? e.message : '获取建议异常');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (editingId != null) {
      fetchSuggestions();
    }
  }, [editingId]);

  const handleRollback = async (fromId: number) => {
    if (fromId < 0) {
      setMessages((prev) => prev.filter((m) => m.id !== fromId));
      if (editingId === fromId) {
        setEditingId(null);
        setEditText('');
      }
      return;
    }
    try {
      const beforeRollbackCount = messages.filter(m => m.id > 0).length;
      
      await fetch(`/api/db/chapters/${chapterId}/messages?id=${fromId}`, { method: 'DELETE' });
      const currentIndex = messages.findIndex((m) => m.id === fromId);
      const current = currentIndex >= 0 ? messages[currentIndex] : undefined;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === fromId);
        if (idx === -1) return sortByIdAsc(prev.filter((m) => m.id <= fromId));
        return sortByIdAsc(prev.slice(0, idx + 1));
      });
      setEditingId(fromId);
      setEditText(current?.content.replace(/^(正文：|开场白：)/, '') ?? '');
      
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      const canonical = allMsgs.filter((m) => m.id > 0);
      const afterRollbackCount = canonical.length;
      
      const messageCountDiff = beforeRollbackCount - afterRollbackCount;
      if (afterRollbackCount >= 10 && messageCountDiff > 5) {
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommitEdit = async () => {
    if (editingId == null || saving || !socket || !isConnected) return;
    setSaving(true);
    setStreamingMessage('');
    setIsStreaming(true);
    try {
      const userRes = await fetch(`/api/db/chapters/${chapterId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          role: 'user',
          content: `正文：${editText.replace(/^正文：/, '')}`,
        }),
      });
      const createdUserMsg = await userRes.json();
      if (!userRes.ok) {
        throw new Error(createdUserMsg?.error || '保存用户消息失败');
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...createdUserMsg } : m))
      );
      setEditingId(null);

      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      if (!histRes.ok) {
        throw new Error('获取近10条消息失败');
      }
      const canonical = allMsgs.filter((m) => m.id > 0);
      const recent = sortByIdAsc(canonical).slice(Math.max(0, canonical.length - 10));
      const history = recent.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      const chatData = {
        messages: history,
        worldview: worldContext?.worldview || '',
        master_sitting: worldContext?.master_sitting || '',
        main_characters: worldContext?.main_characters || '',
        background: chapter?.background || '',
        story_analysis: currentStoryAnalysis || '',
        story_guide: storyGuide || '',
        chapterId: chapterId,
        userId: userId
      };

      socket.emit('chat_stream', chatData);

    } catch (e) {
      setError(e instanceof Error ? e.message : '提交异常');
      setIsStreaming(false);
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isStreaming && streamingMessage && socket) {
      const updateMessageList = async () => {
        try {
          const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
          const allMsgs = (await histRes.json()) as ConversationMessage[];
          if (histRes.ok) {
            const canonical = allMsgs.filter((m) => m.id > 0);
            const sortedMessages = sortByIdAsc(canonical);
            setMessages(sortedMessages);
          }

          setStreamingMessage('');
          addEmptyInputBubble();
        } catch (e) {
          console.error('更新消息列表失败:', e);
          setError(e instanceof Error ? e.message : '更新消息列表失败');
        } finally {
          setSaving(false);
        }
      };

      updateMessageList();
    }
  }, [isStreaming, streamingMessage, chapterId, userId, lastAnalysisCount]);

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    }
  };

  const handleSuggestionClick = useCallback(() => {
    setTimeout(() => {
      if (editingId !== null) {
        editInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 100);
  }, [editingId]);

  const sidebar = useMemo(() => {
    return (
      <aside
        style={{
          width: 320,
          borderLeft: '1px solid #eee',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#fafafa',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <WorldPanelComponent 
          chapter={chapter}
          chapterId={chapterId}
          worldContext={worldContext}
        />

        <NovelGenerationComponent
          chapter={chapter}
          chapterId={chapterId}
          userId={userId}
          worldContext={worldContext}
          novels={novels}
          messages={messages}
          onNovelsChange={setNovels}
          socket={socket}
          isConnected={isConnected}
        />
      </aside>
    );
  }, [chapter, chapterId, worldContext, novels, messages, socket, isConnected]);

  const paper = useMemo(() => {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 860,
            maxWidth: '100%',
            height: 'calc(100vh - 64px)',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: 8,
            padding: 24,
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div style={{ color: '#6b7280' }}>加载中...</div>
          ) : error ? (
            <div style={{ color: '#ef4444' }}>{error}</div>
          ) : messages.length === 0 ? (
            <div style={{ color: '#6b7280' }}>暂无消息</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === m.id ? null : prev))}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#ffffff',
                    border: hoveredId === m.id ? '1px solid #9ca3af' : '1px solid transparent',
                    transition: 'border-color 120ms ease',
                    color: '#111827',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {editingId === m.id ? (
                      <input
                          ref={editInputRef}
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                          style={{
                            flex: 1,
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            padding: '6px 8px',
                            outline: 'none',
                          }}
                          placeholder="编辑当前内容，按 Enter 提交"
                        />
                    ) : (
                      <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                        {m.content.replace(/^(正文：|开场白：)/, '')}
                      </div>
                    )}
                    {hoveredId === m.id && editingId !== m.id && (
                      <button
                        type="button"
                        onClick={() => handleRollback(m.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        title="回溯到此处（删除之后所有行）"
                      >
                        回溯
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && streamingMessage && (
                <div
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#f0f9ff',
                    border: '1px solid #3b82f6',
                    transition: 'border-color 120ms ease',
                    color: '#111827',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                      {streamingMessage.replace(/^正文：/, '')}
                      <span style={{ animation: 'pulse 1s infinite' }}>▊</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [messages, hoveredId, loading, error, editingId, editText, saving, isStreaming, streamingMessage]);

  const leftSidebar = useMemo(() => {
    return (
      <aside
        style={{
          width: 320,
          borderRight: '1px solid #eee',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#fafafa',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <AutoPlayComponent
          isPlaying={isAutoPlaying}
          onPlay={() => {
            setIsAutoPlaying(true);
            autoPlayRef.current = true;
            if (editingId != null) {
              setMessages((prev) => prev.filter((m) => m.id !== editingId));
              setEditingId(null);
              setEditText('');
            }
            runAutoPlayCycle();
          }}
          onPause={() => {
            setIsAutoPlaying(false);
            autoPlayRef.current = false;
            addEmptyInputBubble();
          }}
        />

        <StoryAnalysisComponent
          chapter={chapter}
          chapterId={chapterId}
          worldContext={worldContext}
          messages={messages}
          lastAnalysisCount={lastAnalysisCount}
          onLastAnalysisCountChange={setLastAnalysisCount}
          onStoryAnalysisChange={setStoryAnalysis}
          onStoryAnalysisExpose={setCurrentStoryAnalysis}
        />
        
        <StoryGuideComponent
          storyGuide={storyGuide}
          isSavingGuide={isSavingGuide}
          onStoryGuideChange={setStoryGuide}
          onIsSavingGuideChange={setIsSavingGuide}
        />
      </aside>
    );
  }, [chapter, chapterId, worldContext, messages, lastAnalysisCount, currentStoryAnalysis, storyGuide, isSavingGuide, isAutoPlaying, editingId]);

  const suggestionPanel = useMemo(() => {
    return (
      <SuggestionsComponent
        editingId={editingId}
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        suggestionsError={suggestionsError}
        onEditTextChange={setEditText}
        onSuggestionClick={handleSuggestionClick}
      />
    );
  }, [editingId, suggestions, suggestionsLoading, suggestionsError, setEditText]);

  const mobileBottomBar = useMemo(() => {
    if (!isMobile) return null;
    
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 900,
        }}
      >
        <button
          onClick={() => togglePanel('left')}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            background: activePanel === 'left' ? '#f0f9ff' : '#ffffff',
            color: activePanel === 'left' ? '#2563eb' : '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          剧情分析
        </button>
        <button
          onClick={() => togglePanel('suggestion')}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            background: activePanel === 'suggestion' ? '#f0f9ff' : '#ffffff',
            color: activePanel === 'suggestion' ? '#2563eb' : '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          灵感建议
        </button>
        <button
          onClick={() => togglePanel('right')}
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            background: activePanel === 'right' ? '#f0f9ff' : '#ffffff',
            color: activePanel === 'right' ? '#2563eb' : '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          世界面板
        </button>
      </div>
    );
  }, [isMobile, activePanel]);
  
  const mobileOverlay = useMemo(() => {
    if (!isMobile || !activePanel) return null;
    
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 899,
        }}
        onClick={closePanel}
      />
    );
  }, [isMobile, activePanel]);
  
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {isMobile ? (
        <>
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              paddingBottom: 60,
            }}
          >
            {paper}
          </div>
          
          {(activePanel === 'left' || activePanel === 'suggestion' || activePanel === 'right') && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: activePanel === 'right' ? 0 : undefined,
                left: activePanel === 'left' || activePanel === 'suggestion' ? 0 : undefined,
                width: '80%',
                maxWidth: 400,
                height: '100vh',
                backgroundColor: '#ffffff',
                zIndex: 900,
                overflowY: 'auto',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #e5e7eb',
                  zIndex: 10,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {activePanel === 'left' && '剧情分析'}
                  {activePanel === 'suggestion' && '灵感建议'}
                  {activePanel === 'right' && '世界面板'}
                </h3>
                <button
                  onClick={closePanel}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '4px',
                  }}
                >
                  &times;
                </button>
              </div>
              
              <div style={{ padding: 16 }}>
                {activePanel === 'left' && leftSidebar}
                {activePanel === 'suggestion' && suggestionPanel}
                {activePanel === 'right' && sidebar}
              </div>
            </div>
          )}
          
          {mobileOverlay}
          {mobileBottomBar}
        </>
      ) : (
        <>
          {leftSidebar}
          {paper}
          {suggestionPanel}
          {sidebar}
        </>
      )}
    </div>
  );
}