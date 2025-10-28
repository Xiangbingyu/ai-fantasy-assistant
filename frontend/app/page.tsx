'use client';
import { useState } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ping = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <h1>AI Fantasy Assistant (Next.js)</h1>
      <button onClick={ping} disabled={loading}>
        {loading ? '请求中...' : '测试后端 API'}
      </button>
      <pre>{error ? error : JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}