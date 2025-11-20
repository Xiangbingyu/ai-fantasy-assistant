'use client';

interface SuggestionsComponentProps {
  editingId: number | null;
  suggestions: Array<{ content: string }>;
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  onEditTextChange: (text: string) => void;
  onSuggestionClick?: () => void;
}

export default function SuggestionsComponent({
  editingId,
  suggestions,
  suggestionsLoading,
  suggestionsError,
  onEditTextChange,
  onSuggestionClick,
}: SuggestionsComponentProps) {
  return (
    <aside
      style={{
        width: 280,
        borderLeft: '1px solid #e5e7eb',
        borderRight: '1px solid #e5e7eb',
        background: '#f8fafc',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16 }}>灵感建议</div>
      {editingId == null ? (
        <div style={{ color: '#6b7280' }}>暂无编辑内容</div>
      ) : suggestionsLoading ? (
        <div style={{ color: '#6b7280' }}>生成建议中...</div>
      ) : suggestionsError ? (
        <div style={{ color: '#ef4444' }}>{suggestionsError}</div>
      ) : suggestions.length === 0 ? (
        <div style={{ color: '#6b7280' }}>暂无建议</div>
      ) : (
        suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onEditTextChange(s.content);
              onSuggestionClick?.();
            }}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
            }}
            title="点击将建议填入输入气泡"
          >
            {s.content}
          </button>
        ))
      )}
    </aside>
  );
}