import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

export function useResizable({ initialWidth, minWidth, maxWidth, storageKey }: UseResizableOptions) {
  // 从 localStorage 读取保存的宽度
  const getStoredWidth = () => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const width = parseInt(stored, 10);
        if (!isNaN(width) && width >= minWidth && width <= maxWidth) {
          return width;
        }
      }
    }
    return initialWidth;
  };

  const [width, setWidth] = useState(getStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    // 立即设置 cursor 样式
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      e.preventDefault();
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 保存到 localStorage
        if (storageKey) {
          localStorage.setItem(storageKey, width.toString());
        }
      }
    };

    if (isResizing) {
      // 使用 capture 模式确保事件被捕获
      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('mouseup', handleMouseUp, { capture: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isResizing, minWidth, maxWidth, storageKey, width]);

  // 保存宽度变化到 localStorage（延迟保存，避免频繁写入）
  useEffect(() => {
    if (!isResizing && storageKey) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, isResizing, storageKey]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
