'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

interface Novel {
  id: number;
  chapter_id: number;
  user_id: number;
  title: string;
  content: string;
  create_time: string;
  popularity: number;
  chapter_name?: string;
  world_name?: string;
  world_id?: number;
}

export default function NovelsPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const currentUserId = Number(params.userId || '0');
  
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
    // 排序状态管理
    const [sortBy, setSortBy] = useState<'create_time' | 'popularity'>('popularity');
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        // 根据排序方式构建URL
        const url = `/api/db/novels?sort_by=${sortBy}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('获取小说列表失败');
        
        const data = await res.json();
        setNovels(data);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '获取小说数据异常';
        setError(errMsg);
        console.error(errMsg, err);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, [sortBy]);

  // 增加小说热度
  const increaseNovelPopularity = async (novelId: number) => {
    try {
      // 调用后端API增加热度
      const res = await fetch(`/api/db/novels/${novelId}/increase-popularity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        // 更新本地状态中的小说热度
        setNovels(prevNovels => 
          prevNovels.map(novel => 
            novel.id === novelId 
              ? { ...novel, popularity: (novel.popularity || 0) + 1 }
              : novel
          )
        );
        
        // 如果当前查看的小说就是被点击的小说，也更新selectedNovel的热度
        if (selectedNovel?.id === novelId) {
          setSelectedNovel(prev => 
            prev ? { ...prev, popularity: (prev.popularity || 0) + 1 } : null
          );
        }
      }
    } catch (error) {
      console.error('增加小说热度失败:', error);
    }
  };

  // 查看小说详情
  const handleViewNovel = (novel: Novel) => {
    // 先增加热度，然后再显示详情
    increaseNovelPopularity(novel.id);
    setSelectedNovel(novel);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setSelectedNovel(null);
  };

  // 返回上一页
  const handleBack = () => {
    router.push(`/hall/${currentUserId}`);
  };

  // 根据搜索词过滤小说
  const filteredNovels = novels.filter(novel => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (novel.title?.toLowerCase().includes(query) || false) ||
      novel.content.toLowerCase().includes(query) ||
      (novel.world_name?.toLowerCase().includes(query) || false) ||
      (novel.chapter_name?.toLowerCase().includes(query) || false) ||
      novel.user_id.toString().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-12 h-12 mb-4 text-indigo-600 animate-spin">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-gray-600 text-lg">正在加载小说集...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-16 h-16 mb-4 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-red-500 text-lg mb-6">加载失败：{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          重试加载
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        title={
          <div className="flex items-center gap-2">
            <img src="/image/logo.jpg" alt="网站logo" className="h-6 w-auto" />
            <span>小说集</span>
          </div>
        }
      />
      
      <div className="container mx-auto px-4 py-2">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
          </svg>
          返回
        </button>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">所有小说</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="搜索小说名称、内容或标签"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSortBy('create_time')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortBy === 'create_time' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                最新发布
              </button>
              <button
                onClick={() => setSortBy('popularity')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortBy === 'popularity' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                最热排行
              </button>
            </div>
          </div>
        </div>
        
        {filteredNovels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map(novel => (
              <NovelCard 
                key={novel.id} 
                novel={novel} 
                onClick={() => handleViewNovel(novel)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{searchQuery ? '没有找到匹配的小说' : '暂无小说内容'}</p>
          </div>
        )}
      </div>
      
      {/* 小说详情弹窗 */}
      {selectedNovel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800">{selectedNovel.title || '未命名小说'}</h3>
                <button 
                  onClick={handleCloseDetail} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>用户ID: {selectedNovel.user_id}</span>
                {selectedNovel.world_name && <span>世界: {selectedNovel.world_name}</span>}
                {selectedNovel.chapter_name && <span>章节: {selectedNovel.chapter_name}</span>}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  热度: {selectedNovel.popularity || 0}
                </span>
                <span>{new Date(selectedNovel.create_time).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedNovel.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 小说卡片组件
function NovelCard({ novel, onClick }: { novel: Novel, onClick: () => void }) {
  // 截取部分内容作为预览
  const getPreview = (content: string, maxLength: number = 100) => {
    if (!content) return '暂无内容';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
      onClick={onClick}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">
        {novel.title || '未命名小说'}
      </h3>
      <p className="text-gray-500 text-sm mb-3 line-clamp-3">
        {getPreview(novel.content)}
      </p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>用户 {novel.user_id}</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
            {novel.popularity || 0}
          </span>
        </div>
        <span>{new Date(novel.create_time).toLocaleDateString()}</span>
      </div>
      {(novel.world_name || novel.chapter_name) && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {novel.world_name && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs">
              {novel.world_name}
            </span>
          )}
          {novel.chapter_name && (
            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-xs">
              {novel.chapter_name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}