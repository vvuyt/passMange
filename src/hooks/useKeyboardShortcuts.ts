/**
 * 键盘快捷键 Hook
 * 实现全局快捷键：Ctrl+F 搜索、Ctrl+N 新建、Ctrl+L 锁定
 */

import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSearch?: () => void;
  onNew?: () => void;
  onLock?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 检查是否按下 Ctrl 键（Windows/Linux）或 Cmd 键（macOS）
    const isModifierPressed = event.ctrlKey || event.metaKey;
    
    if (!isModifierPressed) return;

    // 忽略在输入框中的快捷键（除了 Escape）
    const target = event.target as HTMLElement;
    const isInputFocused = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;

    switch (event.key.toLowerCase()) {
      case 'f':
        // Ctrl+F: 搜索
        if (!isInputFocused && handlers.onSearch) {
          event.preventDefault();
          handlers.onSearch();
        }
        break;

      case 'n':
        // Ctrl+N: 新建
        if (handlers.onNew) {
          event.preventDefault();
          handlers.onNew();
        }
        break;

      case 'l':
        // Ctrl+L: 锁定
        if (handlers.onLock) {
          event.preventDefault();
          handlers.onLock();
        }
        break;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
