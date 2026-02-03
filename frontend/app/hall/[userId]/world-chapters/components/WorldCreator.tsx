'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface FunctionCallResult {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ResponseData {
  content: FunctionCallResult | string;
  finished: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WorldCreator: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 建立WebSocket连接
  useEffect(() => {
    // 创建Socket.IO实例连接到后端服务器
    const newSocket = io('http://112.19.164.208:4000');

    // 监听连接事件
    newSocket.on('connect', () => {
      console.log('连接成功');
      setConnected(true);
      setError(null);
    });

    // 监听断开连接事件
    newSocket.on('disconnect', () => {
      console.log('连接断开');
      setConnected(false);
    });

    // 监听错误事件
    newSocket.on('connect_error', (err) => {
      console.error('连接错误:', err);
      setError('连接失败，请检查后端服务是否运行');
      setConnected(false);
    });

    // 监听世界观创建数据响应
    newSocket.on('world_creator_data', (data: ResponseData) => {
      console.log('收到世界观创建数据:', data);
      setResponse(data.content);
      if (data.finished) {
        setLoading(false);
        // 将AI响应添加到历史记录
        try {
          let aiContent = '';
          if (typeof data.content === 'string') {
            aiContent = data.content;
          } else if (data.content.function && data.content.function.arguments) {
            // 提取关键信息作为AI响应内容
            const args = JSON.parse(data.content.function.arguments);
            
            // 构建其余人物信息文本
            let otherCharactersText = '';
            if (args.other_character_names && args.other_character_backgrounds && 
                args.other_character_names.length > 0 && args.other_character_backgrounds.length > 0) {
                otherCharactersText = '\n\n其余人物：';
                args.other_character_names.forEach((name: string, index: number) => {
                    const background = args.other_character_backgrounds[index] || '暂无背景信息';
                    otherCharactersText += `\n- ${name}：${background}`;
                });
            }
            
            aiContent = `已根据您的要求创建/修改世界观：\n世界名称：${args.world_name || '未设置'}\n主要角色：${args.character_name || '未设置'}\n章节：${args.chapter_name || '未设置'}${otherCharactersText}`;
          }
          setHistory(prev => [...prev, { role: 'assistant', content: aiContent }]);
        } catch (e) {
          console.error('解析function call响应失败:', e);
        }
      }
    });

    // 监听世界观创建结束事件
    newSocket.on('world_creator_end', () => {
      console.log('世界观创建结束');
      setLoading(false);
    });

    // 监听错误事件
    newSocket.on('world_creator_error', (data: { error: string }) => {
      console.error('世界观创建错误:', data.error);
      setError(data.error);
      setLoading(false);
    });

    setSocket(newSocket);

    // 清理函数
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 添加聊天容器的引用
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部（限制在组件内部滚动）
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 监听历史记录变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // 发送世界观创建请求
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !connected || !message.trim()) {
      return;
    }

    // 保存用户消息到历史记录
    const userMessage = message.trim();
    setHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setLoading(true);
    setError(null);

    // 准备发送的数据，包含历史对话
    const data = {
      message: userMessage,
      history: history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      userId: 'test-user',
    };

    // 发送world-creator事件
    socket.emit('world-creator', data);
    console.log('发送世界观创建请求:', data);
    
    // 清空输入框
    setMessage('');
  };

  // 处理使用设定按钮点击事件
  const handleApplySettings = () => {
    if (!response) return;
    
    try {
      let parsedData = {};
      
      // 解析response数据
      if (typeof response === 'string') {
        try {
          parsedData = JSON.parse(response);
        } catch (e) {
          console.error('无法解析字符串响应:', e);
          alert('生成结果格式不正确，无法应用设定');
          return;
        }
      } else if (response.function && response.function.arguments) {
        parsedData = JSON.parse(response.function.arguments);
      }
      
      // 创建自定义事件，将数据传递给父组件
      const event = new CustomEvent('worldSettingsUpdate', {
        detail: parsedData
      });
      window.dispatchEvent(event);
      
      alert('设定已成功应用！');
    } catch (e) {
      console.error('应用设定时出错:', e);
      alert('应用设定失败，请检查生成结果格式');
    }
  };

  // 格式化显示function call结果
  const formatFunctionCallResult = (result: any) => {
    if (!result) {
      return loading ? '正在生成' : '暂无响应数据';
    }
    
    if (typeof result === 'string') {
      return result;
    }
    
    try {
      // 解析arguments字符串为JSON对象
      const args = JSON.parse(result.function.arguments);
      return JSON.stringify(args, null, 2);
    } catch (e) {
      return JSON.stringify(result, null, 2);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        世界生成助手
      </h3>
      
      {/* 连接状态指示器 */}
      <div className={`p-3 rounded-lg mb-4 ${connected ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800/50'}`}>
        <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        连接状态: {connected ? '已连接' : '未连接'}
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 border border-red-100 dark:border-red-800/50">
          <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          错误: {error}
        </div>
      )}

      {/* Function Call 响应结果区域 - 固定窗口，始终存在，增加高度确保按钮可见 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800/50 transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-700/50">
        <h4 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          生成结果
        </h4>
        <pre className="whitespace-pre-wrap word-break-break-all p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[160px] max-h-[200px] overflow-auto text-sm font-mono">
          {formatFunctionCallResult(response)}
        </pre>
        {/* 使用设定按钮 - 确保始终可见 */}
        <div className="mt-3">
          <button
            onClick={handleApplySettings}
            disabled={!response || loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${!response || loading ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-400 dark:text-emerald-300/60 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            使用设定
          </button>
        </div>
      </div>

      {/* 聊天记录区域 - 中间部分 */}
      <div 
        ref={chatContainerRef}
        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-white dark:bg-gray-800 flex-1 min-h-[150px] max-h-[250px] overflow-auto"
      >
        <h4 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          对话历史
        </h4>
        {history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center italic py-6">暂无对话记录</p>
        ) : (
          <div className="space-y-3">
            {history.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'} ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[85%] word-break-break-word`}
              >
                <div className="font-medium mb-1 text-sm">
                  {msg.role === 'user' ? '用户' : 'AI'}
                </div>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入表单 - 最下方 */}
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="mb-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="请输入您对世界观的修改要求，如：帮我生成一个剑与魔法的世界..."
            className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-200 outline-none min-h-[90px] resize-none ${loading || !connected ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={loading || !connected}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !connected || !message.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${loading || !connected || !message.trim() ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-300/60 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm'}`}
        >
          {loading ? (
            <>
              <svg className="w-4.5 h-4.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              处理中...
            </>
          ) : (
            <>
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              发送
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default WorldCreator;