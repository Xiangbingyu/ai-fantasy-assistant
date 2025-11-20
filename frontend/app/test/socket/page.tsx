'use client';

import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

export default function WebSocketTest() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chatResponse, setChatResponse] = useState('');
  const [analysisResponse, setAnalysisResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 测试数据
  const [testData] = useState({
    messages: [
      { role: 'user', content: '课堂上，老师正站在黑板前讲课' }
    ],
    worldview: '这是一个现代都市背景的奇幻世界',
    master_sitting: '艾莉丝：同班同学，活泼开朗',
    background: '玩家扮演一位刚刚入门的魔法学院学生',
    main_characters: '老师：对艾莉丝暗恋对象',
    story_analysis: '玩家刚进入魔法学院，对一切都很好奇',
    story_guide: '引导玩家了解更多关于魔法世界的设定'
  });

  // 初始化Socket连接
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
    
    // 监听聊天流式响应
    newSocket.on('chat_stream_data', (data) => {
      setChatResponse(prev => prev + data.content);
    });
    
    newSocket.on('chat_stream_end', () => {
      setIsLoading(false);
    });
    
    newSocket.on('chat_stream_error', (error) => {
      console.error('Chat error:', error);
      setIsLoading(false);
    });
    
    // 监听分析流式响应
    newSocket.on('chat_analyze_stream_data', (data) => {
      setAnalysisResponse(prev => prev + data.content);
    });
    
    newSocket.on('chat_analyze_stream_end', () => {
      setIsAnalyzing(false);
    });
    
    newSocket.on('chat_analyze_stream_error', (error) => {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 测试流式聊天
  const testChatStream = () => {
    if (!socket || !isConnected) return;
    
    setIsLoading(true);
    setChatResponse('');
    
    socket.emit('chat_stream', testData);
  };

  // 测试流式分析
  const testAnalysisStream = () => {
    if (!socket || !isConnected) return;
    
    setIsAnalyzing(true);
    setAnalysisResponse('');
    
    socket.emit('chat_analyze_stream', testData);
  };

  // 清除响应
  const clearResponses = () => {
    setChatResponse('');
    setAnalysisResponse('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            WebSocket 流式传输测试页面
          </h1>
          
          {/* 连接状态 */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm">
              WebSocket 状态: {isConnected ? '已连接' : '未连接'}
            </span>
          </div>

          {/* 服务器地址显示 */}
          <div className="bg-gray-100 p-3 rounded mb-4">
            <p className="text-sm text-gray-600">
              服务器地址: <span className="font-mono">http://localhost:4000</span>
            </p>
          </div>

          {/* 测试按钮 */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={testChatStream}
              disabled={!isConnected || isLoading}
              className={`px-6 py-2 rounded text-white font-medium ${
                isConnected && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? '聊天流式传输中...' : '测试聊天流式传输'}
            </button>
            
            <button
              onClick={testAnalysisStream}
              disabled={!isConnected || isAnalyzing}
              className={`px-6 py-2 rounded text-white font-medium ${
                isConnected && !isAnalyzing
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? '分析流式传输中...' : '测试分析流式传输'}
            </button>
            
            <button
              onClick={clearResponses}
              className="px-6 py-2 rounded text-white font-medium bg-gray-600 hover:bg-gray-700"
            >
              清除响应
            </button>
          </div>

          {/* 测试参数显示 */}
          <details className="mb-6">
            <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-2">
              查看测试参数
            </summary>
            <div className="bg-gray-100 p-4 rounded overflow-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          </details>
        </div>

        {/* 聊天响应显示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            聊天流式响应
          </h2>
          <div className="min-h-[200px] bg-gray-50 p-4 rounded border">
            {isLoading && (
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="text-sm">流式传输中...</span>
              </div>
            )}
            <div className="text-gray-700 whitespace-pre-wrap">
              {chatResponse || '点击"测试聊天流式传输"按钮开始测试'}
            </div>
          </div>
        </div>

        {/* 分析响应显示 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            分析流式响应
          </h2>
          <div className="min-h-[200px] bg-gray-50 p-4 rounded border">
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full" />
                <span className="text-sm">流式传输中...</span>
              </div>
            )}
            <div className="text-gray-700 whitespace-pre-wrap">
              {analysisResponse || '点击"测试分析流式传输"按钮开始测试'}
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            使用说明
          </h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• 确保后端服务器正在运行 (端口 4000)</li>
            <li>• 点击"测试聊天流式传输"测试 chat_stream 事件</li>
            <li>• 点击"测试分析流式传输"测试 chat_analyze_stream 事件</li>
            <li>• 响应将以流的形式逐步显示</li>
            <li>• 可以查看测试参数来了解发送的数据格式</li>
          </ul>
        </div>

        {/* 错误信息显示 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            调试信息
          </h3>
          <div className="text-red-700 text-sm">
            <p>在浏览器开发者工具的控制台中查看详细的连接和错误信息</p>
            <p>按 F12 打开开发者工具 → Console 选项卡</p>
          </div>
        </div>
      </div>
    </div>
  );
}