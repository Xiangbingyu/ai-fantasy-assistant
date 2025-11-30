// components/FilterBar.tsx
import { useState } from 'react';

interface FilterBarProps {
    sortBy: string;
    setSortBy: (sort: string) => void;
    tags: string[];
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function FilterBar({
    sortBy,
    setSortBy,
    tags,
    selectedTags,
    setSelectedTags,
    searchQuery,
    setSearchQuery
}: FilterBarProps) {
    const [showAllTags, setShowAllTags] = useState(false);
    return (
        <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center gap-3 w-full">
                {/* 标签选择 - 左侧 */}
                <div className="flex items-center gap-2 h-full">
                    <span className="text-sm text-gray-500 dark:text-gray-400 h-full flex items-center">标签:</span>
                    <div className="flex flex-wrap items-center gap-2 h-full">
                        {tags.slice(0, showAllTags ? tags.length : 5).map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() =>
                                        setSelectedTags(
                                            isSelected
                                                ? selectedTags.filter(t => t !== tag)
                                                : [...selectedTags, tag]
                                        )
                                    }
                                    className={`px-2 py-2 rounded text-sm ${
                                        isSelected
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    } h-full flex items-center`}
                                >
                                    {tag}
                                </button>
                            );
                        })}

                        {tags.length > 5 && (
                            <button
                                onClick={() => setShowAllTags(!showAllTags)}
                                className="px-2 py-2 text-sm text-blue-500 hover:underline h-full flex items-center"
                            >
                                {showAllTags ? '收起' : `+${tags.length - 5}个标签`}
                            </button>
                        )}

                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => setSelectedTags([])}
                                className="px-2 py-2 text-sm text-gray-500 hover:text-red-500 h-full flex items-center"
                            >
                                清除标签筛选
                            </button>
                        )}
                    </div>
                </div>

                {/* 搜索框和排序按钮 - 右侧 */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 w-full sm:w-auto ml-auto">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="搜索世界名称或标签..."
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
                            onClick={() => setSortBy('更新时间')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortBy === '更新时间' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            最新发布
                        </button>
                        <button
                            onClick={() => setSortBy('热度')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortBy === '热度' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            最热排行
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}