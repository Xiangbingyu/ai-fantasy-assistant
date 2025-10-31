'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Chapter, ConversationMessage, NovelRecord } from '../../../types/db';

export default function ChapterPage() {
  const params = useParams<{ userId: string; chapterId: string }>();
  const userId = params.userId;
  const chapterId = params.chapterId;

  const [chapter, setChapter] = useState<Partial<Chapter> | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // 新增：占位气泡临时ID序列与初始化标记
  const [tempIdSeq, setTempIdSeq] = useState<number>(-1);
  const [initializedInput, setInitializedInput] = useState<boolean>(false);

  // 新增：插入一个用于输入的空气泡（占位）并进入编辑模式
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
    setMessages((prev) => [...prev, placeholder]);
    setEditingId(tempId);
    setEditText('');
    setTempIdSeq((prev) => prev - 1);
  };
  // 加载章节信息（后端暂未提供GET /chapters/:id，尝试请求并提供容错）
  useEffect(() => {
    let cancelled = false;
    const loadChapter = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}`);
        if (!res.ok) throw new Error('暂无章节详情接口');
        const data = await res.json();
        if (!cancelled) setChapter(data as Chapter);
      } catch {
        // 提供占位信息，不阻塞页面渲染
        if (!cancelled) {
          setChapter({
            id: Number(chapterId),
            name: `章节 ${chapterId}`,
            background: '（暂未获取到背景信息）',
          });
        }
      }
    };
    loadChapter();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // 加载消息
  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/messages`);
        if (!res.ok) throw new Error('获取消息失败');
        const data = (await res.json()) as ConversationMessage[];
        if (!cancelled) setMessages(data);
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

  // 新增：首次进入页面后，消息加载完成即插入一个空气泡供用户输入
  useEffect(() => {
    if (!loading && !error && !initializedInput) {
      addEmptyInputBubble();
      setInitializedInput(true);
    }
  }, [loading, error, initializedInput]);

  // 加载小说记录
  useEffect(() => {
    let cancelled = false;
    const loadNovels = async () => {
      try {
        const res = await fetch(`/api/db/chapters/${chapterId}/novels`);
        if (!res.ok) throw new Error('获取小说失败');
        const data = (await res.json()) as NovelRecord[];
        if (!cancelled) setNovels(data);
      } catch (e) {
        // 小说列表失败不阻塞主区域
        console.error(e);
      }
    };
    loadNovels();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // 回溯：删除该消息及之后所有（数据库删除，前端保留当前行，并进入编辑模式）
  const handleRollback = async (fromId: number) => {
    // 如果回溯的是占位输入气泡（负ID），仅前端移除，不调用后端
    if (fromId < 0) {
      setMessages((prev) => prev.filter((m) => m.id !== fromId));
      if (editingId === fromId) {
        setEditingId(null);
        setEditText('');
      }
      return;
    }

    try {
      // 后端删除：删除该消息及之后所有
      await fetch(`/api/db/chapters/${chapterId}/messages?id=${fromId}`, {
        method: 'DELETE',
      });

      // 先拿到当前行内容与索引
      const currentIndex = messages.findIndex((m) => m.id === fromId);
      const current = currentIndex >= 0 ? messages[currentIndex] : undefined;

      // 前端按索引截断：保留到当前行（含当前行），删除其后的所有项
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === fromId);
        if (idx === -1) {
          // 兜底：找不到索引时用旧逻辑，至少不会报错
          return prev.filter((m) => m.id <= fromId);
        }
        return prev.slice(0, idx + 1);
      });

      // 进入编辑模式
      setEditingId(fromId);
      setEditText(current?.content ?? '');
    } catch (e) {
      console.error(e);
    }
  };

  // 提交编辑：按 Enter 将该行内容 POST 为新消息，然后调用聊天接口生成下一行AI气泡并入库
  const handleCommitEdit = async () => {
    if (editingId == null || saving) return;
    setSaving(true);
    try {
      // 1) 先将该行内容作为“用户消息”保存进数据库
      const userRes = await fetch(`/api/db/chapters/${chapterId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          role: 'user',
          content: editText,
        }),
      });
      const createdUserMsg = await userRes.json();
      if (!userRes.ok) {
        throw new Error(createdUserMsg?.error || '保存用户消息失败');
      }

      // 用返回的入库结果替换当前编辑的气泡（更新 id、时间等）
      setMessages((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...createdUserMsg } : m))
      );
      setEditingId(null);

      // 2) 获取近30条消息，作为聊天接口的上下文
      const histRes = await fetch(`/api/db/chapters/${chapterId}/messages`);
      const allMsgs = (await histRes.json()) as ConversationMessage[];
      if (!histRes.ok) {
        throw new Error('获取近30条消息失败');
      }
      const recent = allMsgs.slice(Math.max(0, allMsgs.length - 30));
      // 修复：将后端'ai'角色映射为大模型所需'assistant'
      const history = recent.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

      // 3) 调用聊天接口，生成AI回复，并添加为下一行气泡；随后也入库
      const chatRes = await fetch(`http://localhost:5000/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        const msg =
          typeof chatData?.error === 'string'
            ? chatData.error
            : chatData?.error?.message || '聊天接口调用失败';
        throw new Error(msg);
      }
      const aiContent: string = chatData.response ?? '';

      // 将AI回复保存到数据库
      const aiSaveRes = await fetch(`/api/db/chapters/${chapterId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          role: 'ai',
          content: aiContent,
        }),
      });
      const createdAiMsg = await aiSaveRes.json();
      if (!aiSaveRes.ok) {
        throw new Error(createdAiMsg?.error || '保存AI消息失败');
      }

      // 在前端追加AI气泡
      setMessages((prev) => [...prev, createdAiMsg]);

      // 新增：AI回复后，立即插入一个新的空气泡让用户继续输入
      addEmptyInputBubble();
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交异常');
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    }
  };

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
        }}
      >
        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>章节简介</div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>名称：</span>
            <span>{chapter?.name ?? `章节 ${chapterId}`}</span>
          </div>
          <div>
            <div style={{ color: '#6b7280', marginBottom: 4 }}>背景：</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>
              {chapter?.background ?? '（暂未获取到背景信息）'}
            </div>
          </div>
        </section>

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
            // 暂不写逻辑：占位按钮
            onClick={() => {}}
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'not-allowed',
              color: '#6b7280',
            }}
            disabled
          >
            生成故事（开发中）
          </button>
        </section>
      </aside>
    );
  }, [chapter?.name, chapter?.background, novels, chapterId]);

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
                    background: '#f9fafb',
                    border: hoveredId === m.id ? '1px solid #9ca3af' : '1px solid transparent',
                    transition: 'border-color 120ms ease',
                    color: '#111827',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {editingId === m.id ? (
                      <input
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
                      <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{m.content}</div>
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
            </div>
          )}
        </div>
      </div>
    );
  }, [messages, hoveredId, loading, error, editingId, editText, saving]);
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {paper}
      {sidebar}
    </div>
  );
}