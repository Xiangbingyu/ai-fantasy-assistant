'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestAsyncNovelPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    const socketInstance = io('http://120.48.16.108:4000', {
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      addLog('WebSocket连接成功');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      addLog('WebSocket连接断开');
    });

    socketInstance.on('novel_progress', (data) => {
      addLog(`收到进度更新: ${JSON.stringify(data)}`);
    });

    socketInstance.on('novel_complete', (data) => {
      addLog(`任务完成: ${JSON.stringify(data)}`);
    });

    socketInstance.on('novel_error', (data) => {
      addLog(`任务错误: ${JSON.stringify(data)}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const testNovelAPI = async () => {
    addLog('开始测试小说生成API...');
    
    try {
      // 测试任务提交
      const response = await fetch('/api/novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '测试提示：从前有座山，山里有座庙...',
          worldview: '测试世界观',
          master_sitting: '测试师父',
          main_characters: { name: '测试角色' },
          background: '测试背景',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog(`任务提交成功，任务ID: ${data.task_id}`);
        
        // 测试状态查询
        setTimeout(async () => {
          try {
            const statusResponse = await fetch(`/api/novel/status/${data.task_id}`);
            const statusData = await statusResponse.json();
            addLog(`任务状态查询: ${JSON.stringify(statusData)}`);
          } catch (error) {
            addLog(`状态查询失败: ${error}`);
          }
        }, 2000);
      } else {
        addLog(`任务提交失败: ${data.error}`);
      }
    } catch (error) {
      addLog(`API测试失败: ${error}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>异步小说生成测试页面</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h2>连接状态</h2>
        <p>WebSocket: {isConnected ? '已连接' : '未连接'}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={testNovelAPI}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          测试小说生成API
        </button>
      </div>

      <div>
        <h2>日志</h2>
        <div 
          style={{
            backgroundColor: '#f3f4f6',
            padding: 10,
            borderRadius: 6,
            height: 300,
            overflowY: 'auto',
            fontSize: '12px',
          }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: 4 }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}