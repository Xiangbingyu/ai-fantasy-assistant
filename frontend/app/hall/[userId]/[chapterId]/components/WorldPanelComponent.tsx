'use client';

import { useState } from 'react';
import type { Chapter } from '../../../../types/db';

const formatMasterCharacterInfo = (content: string | null | undefined): string => {
  if (!content) return '';
  
  const result: string[] = [];
  const sections = content.split('|||');
  
  sections.forEach(section => {
    const [key, value] = section.split('###');
    if (key && value) {
      const formattedKey = key.replace(/：$/, '') + '：';
      const processedValue = value.replace(/；$/, '').replace(/\\n/g, '\n');
      result.push(`• ${formattedKey} ${processedValue}`);
    }
  });
  
  return result.join('\n');
};

const formatMainCharacters = (characters: any): string => {
  if (!characters) return '';
  
  if (typeof characters === 'string') {
    try {
      const parsed = JSON.parse(characters);
      if (Array.isArray(parsed)) {
        return formatCharactersArray(parsed);
      }
    } catch {
      return characters.replace(/\\n/g, '\n');
    }
  }
  
  if (Array.isArray(characters)) {
    return formatCharactersArray(characters);
  }
  
  return JSON.stringify(characters, null, 2).replace(/\\n/g, '\n');
};

const formatCharactersArray = (characters: Array<{name?: string; background?: string; [key: string]: any}>): string => {
  return characters.map((char, index) => {
    let result = `【人物${index + 1}】`;
    if (char.name) result += ` ${char.name}`;
    if (char.background) {
      const processedBackground = char.background.replace(/\\n/g, '\n');
      result += `\n${processedBackground}`;
    }
    Object.entries(char).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'background') {
        const processedValue = String(value).replace(/\\n/g, '\n');
        result += `\n${key}：${processedValue}`;
      }
    });
    return result;
  }).join('\n\n');
};

const WorldPanelItem = ({ 
  title, 
  content, 
  placeholder, 
  style, 
  formatter 
}: { 
  title: string; 
  content: any; 
  placeholder: string; 
  style?: React.CSSProperties; 
  formatter?: (content: any) => string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const rawContent = content || placeholder;
  const displayContent = formatter ? formatter(rawContent) : (rawContent?.toString() || placeholder);
  const hasContent = content != null && content !== '';
  const preview = displayContent.length > 100 
    ? displayContent.substring(0, 100) + '...' 
    : displayContent;
  
  return (
    <div style={style}>
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#6b7280',
          fontWeight: 500,
          marginBottom: 4,
          cursor: hasContent ? 'pointer' : 'default'
        }}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        <span>{title}：</span>
        {hasContent && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {isExpanded ? '收起 ▲' : '展开 ▼'}
          </span>
        )}
      </div>
      <div 
        style={{
          whiteSpace: 'pre-wrap', 
          color: '#111827',
          fontSize: 14,
          maxHeight: isExpanded ? 'none' : '60px',
          overflow: isExpanded ? 'visible' : 'hidden',
          lineHeight: 1.5
        }}
      >
        {isExpanded ? displayContent : preview}
      </div>
    </div>
  );
};

interface WorldPanelComponentProps {
  chapter: Partial<Chapter> | null;
  chapterId: string;
  worldContext: {worldview?: string; master_sitting?: string; main_characters?: any;} | null;
}

export default function WorldPanelComponent({ chapter, chapterId, worldContext }: WorldPanelComponentProps) {
  return (
    <>
      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>章节简介</div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: '#6b7280' }}>名称：</span>
          <span>{chapter?.name ?? `章节 ${chapterId}`}</span>
        </div>
        <div>
          <div style={{ color: '#6b7280', marginBottom: 4 }}>玩家信息：</div>
          <div style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>
            {chapter?.background ?? '（暂未获取到玩家信息）'}
          </div>
        </div>
      </section>
      
      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>世界面板</div>
        
        <WorldPanelItem 
          title="世界观" 
          content={worldContext?.worldview} 
          placeholder="暂未获取到世界观信息" 
        />
        
        <WorldPanelItem 
          title="核心人物" 
          content={worldContext?.master_sitting} 
          placeholder="暂未获取到核心人物信息" 
          style={{ marginTop: '12px' }} 
          formatter={formatMasterCharacterInfo}
        />
        
        <WorldPanelItem 
          title="其他人物" 
          content={worldContext?.main_characters}
          placeholder="暂未获取到其他人物信息" 
          style={{ marginTop: '12px' }} 
          formatter={formatMainCharacters}
        />
      </section>
    </>
  );
}