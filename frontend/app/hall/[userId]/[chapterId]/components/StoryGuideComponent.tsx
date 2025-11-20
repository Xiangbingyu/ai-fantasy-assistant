'use client';

interface StoryGuideComponentProps {
  storyGuide: string;
  isSavingGuide: boolean;
  onStoryGuideChange: (guide: string) => void;
  onIsSavingGuideChange: (saving: boolean) => void;
}

export default function StoryGuideComponent({
  storyGuide,
  isSavingGuide,
  onStoryGuideChange,
  onIsSavingGuideChange,
}: StoryGuideComponentProps) {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>剧情引导</div>
      <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
        输入你想要引导的剧情方向，保存后将影响AI的回复生成
      </div>
      <textarea
        value={storyGuide}
        onChange={(e) => onStoryGuideChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '8px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          resize: 'vertical',
          fontSize: 14,
          marginBottom: 8,
        }}
        placeholder="例如：希望角色之间产生冲突，或者推进某个关键情节..."
      />
      <button
        type="button"
        onClick={() => {
          onIsSavingGuideChange(true);
          setTimeout(() => {
            onIsSavingGuideChange(false);
            alert('剧情引导已保存');
          }, 500);
        }}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          background: isSavingGuide ? '#f3f4f6' : '#f9fafb',
          cursor: isSavingGuide ? 'not-allowed' : 'pointer',
          color: isSavingGuide ? '#9ca3af' : '#374151',
        }}
        disabled={isSavingGuide}
      >
        {isSavingGuide ? '保存中...' : '保存引导'}
      </button>
      {storyGuide && (
        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, fontSize: 13 }}>
          当前引导：{storyGuide.length > 50 ? storyGuide.substring(0, 50) + '...' : storyGuide}
        </div>
      )}
    </section>
  );
}