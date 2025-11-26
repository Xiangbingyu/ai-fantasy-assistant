'use client';
import React from 'react';
import { CreateChapterPayload } from '../../../../types/db';

// 章节表单接口定义
export interface ChapterForm {
  id: string; // 前端临时ID（字符串）
  apiId?: number | null; // 后端真实ID（数字或null）
  name: string;
  opening: string;
  background: string;
  isSubmitted: boolean;
}

// 组件Props接口定义
interface ChaptersProps {
  chapters: ChapterForm[];
  currentWorldId: number | null;
  enterFrom: 'sidebar' | 'card' | 'new' | 'unknown';
  chapterDeletingIds: Record<string, boolean>;
  showChapterToast: boolean;
  success: string | null;
  error: string | null;
  setChapters: React.Dispatch<React.SetStateAction<ChapterForm[]>>;
  setChapterDeletingIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowChapterToast: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  goToChapter: (chapterId: number) => void;
  worldLoading: boolean;
  handleCreateWorld: () => Promise<void>;
}

const Chapters: React.FC<ChaptersProps> = ({
  chapters,
  currentWorldId,
  enterFrom,
  chapterDeletingIds,
  showChapterToast,
  success,
  error,
  setChapters,
  setChapterDeletingIds,
  setShowChapterToast,
  setError,
  setSuccess,
  goToChapter,
  worldLoading,
  handleCreateWorld
}) => {
  // 处理章节字段变更
  const handleChapterChange = (id: string, field: 'name' | 'opening' | 'background', value: string) => {
    setChapters(prev =>
      prev.map(chapter =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  // 添加新章节
  const addChapter = () => {
    const newId = `chapter-${Date.now()}`;
    setChapters(prev => [...prev, {
      id: newId,
      apiId: null,
      name: '',
      opening: '',
      background: '',
      isSubmitted: false
    }]);
  };

  // 删除章节
  const removeChapter = async (id: string) => {
    // 1. 根据前端id找到对应章节，获取后端真实apiId
    const chapter = chapters.find(ch => ch.id === id);
    if (!chapter) return;

    // 2. 防止重复点击（正在删除时不执行）
    if (chapterDeletingIds[id]) return;

    // 3. 弹出确认框，避免误删
    const isConfirm = window.confirm(`确定删除章节「${chapter.name || '未命名章节'}」？删除后关联的消息和小说也会同步删除！`);
    if (!isConfirm) return;

    // 4. 标记该章节为"正在删除"
    setChapterDeletingIds(prev => ({ ...prev, [id]: true }));
    setError(null);
    setSuccess(null);

    try {
      // 5. 调用后端DELETE接口（用章节的真实apiId）
      const response = await fetch(`/api/db/chapters/${chapter.apiId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const deleteData = await response.json();
      if (!response.ok) {
        throw new Error(deleteData.error || '删除章节失败');
      }

      // 6. 接口成功：删除前端章节列表中的该章节
      setChapters(prev => prev.filter(ch => ch.id !== id));
      // 7. 显示成功提示（包含后端返回的关联删除数据）
      setSuccess(`章节删除成功！已同步删除${deleteData.deleted_messages}条消息和${deleteData.deleted_novels}部小说`);
      setShowChapterToast(true);
      setTimeout(() => setShowChapterToast(false), 3000);

    } catch (err) {
      // 8. 接口失败：提示错误，不删除前端章节
      setError(err instanceof Error ? err.message : '删除章节时发生未知错误');
    } finally {
      // 9. 取消"正在删除"标记
      setChapterDeletingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <>
      {/* 章节管理板块 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          章节信息（与世界一起创建）
        </h2>

        {/* 新建世界提示 */}
        {enterFrom === 'new' && (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4 border border-green-100 dark:border-green-800/50">
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            你已成功创建世界和章节，点击进入章节开始创作
          </div>
        )}

        <div className="space-y-5">
          {currentWorldId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-300">当前编辑的世界 ID:</span> {currentWorldId}
            </p>
          )}

          {/* 章节列表 */}
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3.5 bg-gray-50 dark:bg-gray-800/50 transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-700/50"
            >
              {/* 章节标题+状态+删除+跳转按钮 */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-800 dark:text-white">章节 {index + 1}</h3>
                  {/* 章节状态标签 */}
                  {chapter.isSubmitted && (
                    <span className="text-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      已提交（ID: {chapter.apiId}）
                    </span>
                  )}
                  {index === 0 && !chapter.isSubmitted && (
                    <span className="text-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                      默认章节（未提交）
                    </span>
                  )}
                </div>

                {/* 操作按钮组：删除 + 跳转 */}
                <div className="flex gap-2">
                  {/* 跳转按钮：仅当apiId存在且用户是世界创作者时显示 */}
                  {chapter.apiId && enterFrom !== 'card' && (
                    <button
                      type="button"
                      onClick={() => chapter.apiId != null && goToChapter(chapter.apiId)}
                      className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      进入章节
                    </button>
                  )}

                  {/* 删除按钮：添加 enterFrom === 'card' 禁用条件 */}
                  <button
                    type="button"
                    onClick={() => removeChapter(chapter.id)}
                    disabled={chapters.length <= 1 || chapterDeletingIds[chapter.id] || enterFrom === 'card' || !currentWorldId}
                    className={`text-sm text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${chapterDeletingIds[chapter.id] ? 'animate-pulse' : ''}`}
                    aria-label={`删除章节 ${index + 1}`}
                  >
                    {chapterDeletingIds[chapter.id] ? (
                      // 加载中：显示旋转图标
                      <svg className="w-4.5 h-4.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    ) : (
                      // 正常状态：显示删除图标
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 章节内容输入 */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={chapter.name}
                  onChange={(e) => handleChapterChange(chapter.id, 'name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none"
                  placeholder="章节名称 *（如：第一章：初入魔法森林）"
                />

                <textarea
                  value={chapter.opening}
                  onChange={(e) => handleChapterChange(chapter.id, 'opening', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none min-h-[90px] resize-none"
                  placeholder="章节开篇"
                />

                <textarea
                  value={chapter.background}
                  onChange={(e) => handleChapterChange(chapter.id, 'background', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none min-h-[90px] resize-none"
                  placeholder="你扮演的角色设定"
                />
              </div>
            </div>
          ))}

          {/* 章节列表下方的添加章节按钮 */}
          <button
            type="button"
            onClick={addChapter}
            className="mb-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all duration-200 flex items-center gap-1.5 shadow-sm w-full justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            添加章节
          </button>
          
          {/* 创建世界和章节按钮 */}
          <button
            onClick={handleCreateWorld}
            disabled={worldLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm flex items-center justify-center gap-2 mt-6"
          >
            {worldLoading ? (
              <>
                <svg className="w-4.5 h-4.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                创建中...
              </>
            ) : (
              <>
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg ">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                创建世界和章节
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Chapters;