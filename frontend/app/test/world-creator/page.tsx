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

export default function WorldCreatorTestPage() {
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
    const newSocket = io('http://localhost:4000', {
      transports: ['websocket'],
      reconnection: true,
    });

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
            
            aiContent = `已根据您的要求创建/修改世界观：
世界名称：${args.world_name}
主要角色：${args.character_name}
章节：${args.chapter_name}${otherCharactersText}`;
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

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // 格式化显示function call结果
  const formatFunctionCallResult = (result: any) => {
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
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>世界观创建测试</h1>
      
      {/* 连接状态指示器 */}
      <div style={{
        padding: '10px',
        borderRadius: '4px',
        backgroundColor: connected ? '#d4edda' : '#f8d7da',
        color: connected ? '#155724' : '#721c24',
      }}>
        连接状态: {connected ? '已连接' : '未连接'}
      </div>

      {/* 错误显示 */}
      {error && (
        <div style={{
          padding: '10px',
          borderRadius: '4px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
        }}>
          错误: {error}
        </div>
      )}

      {/* Function Call 响应结果区域 - 上半部分 */}
      {response && (
        <div style={{
          padding: '20px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          backgroundColor: '#f8f9fa',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <h3>Function Call 响应结果:</h3>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            padding: '10px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            border: '1px solid #ddd',
            maxHeight: '200px',
            overflow: 'auto',
            margin: '10px 0 0 0'
          }}>
            {formatFunctionCallResult(response)}
          </pre>
        </div>
      )}

      {/* 聊天记录区域 - 中间部分 */}
      <div style={{
        padding: '20px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        backgroundColor: '#f8f9fa',
        minHeight: '200px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3>对话历史:</h3>
        {history.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>暂无对话记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {history.map((msg, index) => (
              <div 
                key={index} 
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  wordBreak: 'break-word'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {msg.role === 'user' ? '用户' : 'AI'}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入表单 - 最下方 */}
      <form onSubmit={handleSubmit} style={{ marginTop: 'auto' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="message" style={{ display: 'block', marginBottom: '5px' }}>
            输入修改要求:
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="请输入您对世界观的修改要求..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
            disabled={loading || !connected}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !connected || !message.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !connected || !message.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !connected || !message.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '修改中...' : '发送修改'}
        </button>
      </form>

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>说明：此页面用于测试世界观创建功能，支持多轮对话修改。上方显示最新的Function Call响应结果，中间是对话历史，底部可以输入修改要求。</p>
        <p>确保后端服务正在运行在 http://localhost:4000</p>
        <p>现在支持显示其余人物信息，包括人物名称和背景故事。</p>
      </div>
    </div>
  );
}