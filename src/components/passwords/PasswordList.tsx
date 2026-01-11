import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useSelectionStore } from '../../stores/selection-store';
import Avatar from '../common/Avatar';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// 字母索引
const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function PasswordList({ selectedId, onSelect }: Props) {
  const { entries, selectedCategoryId, selectedTagId, searchQuery } = useVaultStore();
  const { 
    isSelectionMode, 
    selectedIds, 
    lastSelectedId,
    toggleSelection, 
    selectAll, 
    rangeSelect,
    exitSelectionMode,
    enterSelectionMode
  } = useSelectionStore();
  
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<string | null>(null);

  // 过滤和分组
  const { filteredEntries, groupedEntries, availableLetters } = useMemo(() => {
    let result = entries;

    // 按分类筛选
    if (selectedCategoryId) {
      result = result.filter((e) => e.categoryId === selectedCategoryId);
    }

    // 按标签筛选
    if (selectedTagId) {
      result = result.filter((e) => e.tags.includes(selectedTagId));
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.username.toLowerCase().includes(query) ||
          (e.url && e.url.toLowerCase().includes(query))
      );
    }

    // 按首字母排序
    const sorted = [...result].sort((a, b) => 
      a.title.localeCompare(b.title, 'zh-CN')
    );

    // 按首字母分组
    const grouped: Record<string, typeof result> = {};
    const letters = new Set<string>();

    sorted.forEach((entry) => {
      const firstChar = entry.title.charAt(0).toUpperCase();
      // 判断是否为字母
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
      letters.add(letter);
      
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(entry);
    });

    return {
      filteredEntries: sorted,
      groupedEntries: grouped,
      availableLetters: letters,
    };
  }, [entries, selectedCategoryId, selectedTagId, searchQuery]);

  // 获取所有条目ID列表（用于范围选择）
  const allEntryIds = useMemo(() => filteredEntries.map(e => e.id), [filteredEntries]);

  // 键盘快捷键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+A 全选
    if (e.ctrlKey && e.key === 'a' && filteredEntries.length > 0) {
      e.preventDefault();
      if (!isSelectionMode) {
        enterSelectionMode();
      }
      selectAll(allEntryIds);
    }
    
    // Escape 退出选择模式
    if (e.key === 'Escape' && isSelectionMode) {
      exitSelectionMode();
    }
    
    // Delete 删除选中项（需要在 BatchActionToolbar 中处理确认）
    // 这里只是触发选择模式，实际删除在工具栏中
  }, [isSelectionMode, filteredEntries, allEntryIds, enterSelectionMode, exitSelectionMode, selectAll]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 处理条目点击
  const handleEntryClick = (entryId: string, e: React.MouseEvent) => {
    if (isSelectionMode) {
      // 选择模式下
      if (e.shiftKey && lastSelectedId) {
        // Shift+Click 范围选择
        rangeSelect(allEntryIds, lastSelectedId, entryId);
      } else {
        // 普通点击切换选择
        toggleSelection(entryId);
      }
    } else if (e.ctrlKey) {
      // Ctrl+Click 进入选择模式并选中
      enterSelectionMode();
      toggleSelection(entryId);
    } else {
      // 普通点击选择查看
      onSelect(entryId);
    }
  };

  // 滚动到指定字母
  const scrollToLetter = (letter: string) => {
    if (!availableLetters.has(letter)) return;
    
    const element = document.getElementById(`letter-${letter}`);
    if (element && listRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveIndex(letter);
      setTimeout(() => setActiveIndex(null), 1000);
    }
  };

  if (filteredEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-theme-secondary text-sm">
        {searchQuery ? '没有找到匹配的密码' : '暂无密码条目'}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 密码列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 计数和选择模式提示 */}
        <div className="px-4 py-2 text-xs text-theme-secondary border-b border-theme bg-theme-sidebar sticky top-0 z-10 flex items-center justify-between">
          <span>共 {filteredEntries.length} 条密码</span>
          {!isSelectionMode && filteredEntries.length > 0 && (
            <span className="text-theme-secondary/60">Ctrl+点击 进入多选</span>
          )}
        </div>

        {/* 分组列表 */}
        {ALPHABET.filter(letter => availableLetters.has(letter)).map((letter) => (
          <div key={letter} id={`letter-${letter}`}>
            {/* 字母分隔符 */}
            <div className={`px-4 py-1 text-xs font-semibold sticky top-8 z-10 transition-colors ${
              activeIndex === letter 
                ? 'bg-theme-primary text-white' 
                : 'bg-theme-sidebar text-theme-secondary'
            }`}>
              {letter}
            </div>
            
            {/* 该字母下的条目 */}
            {groupedEntries[letter]?.map((entry, index) => {
              const isSelected = selectedIds.has(entry.id);
              return (
                <button
                  key={entry.id}
                  onClick={(e) => handleEntryClick(entry.id, e)}
                  className={`w-full text-left p-4 border-b border-theme transition-all duration-200 hover-lift list-item-enter ${
                    isSelectionMode && isSelected
                      ? 'bg-theme-primary/10 border-l-2 border-l-theme-primary'
                      : selectedId === entry.id 
                        ? 'list-item-selected bg-selected' 
                        : 'list-item-hover'
                  }`}
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                >
                  <div className="flex items-center gap-3">
                    {/* 选择模式下显示复选框 */}
                    {isSelectionMode && (
                      <div 
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-theme-primary border-theme-primary' 
                            : 'border-theme-secondary hover:border-theme-primary'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(entry.id);
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    <Avatar title={entry.title} icon={entry.icon} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${
                        isSelectionMode && isSelected 
                          ? 'text-theme-primary' 
                          : selectedId === entry.id 
                            ? 'text-selected' 
                            : 'text-theme'
                      }`}>{entry.title}</div>
                      <div className="text-theme-secondary text-sm truncate">{entry.username}</div>
                    </div>
                    {entry.favorite && <span className="text-yellow-500">⭐</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 字母索引栏 - 始终显示所有字母 */}
      {filteredEntries.length > 5 && (
        <div className="w-6 flex flex-col items-center py-1 bg-theme-sidebar border-l border-theme">
          {ALPHABET.map((letter) => {
            const hasEntries = availableLetters.has(letter);
            const isActive = activeIndex === letter;
            return (
              <button
                key={letter}
                onClick={() => hasEntries && scrollToLetter(letter)}
                disabled={!hasEntries}
                className={`w-5 h-4 text-[10px] flex items-center justify-center rounded transition-colors ${
                  isActive
                    ? 'bg-theme-primary text-white font-bold'
                    : hasEntries
                      ? 'text-theme font-medium hover:bg-theme-card'
                      : 'text-gray-400 dark:text-gray-600 opacity-40 cursor-not-allowed'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
