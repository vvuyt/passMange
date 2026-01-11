import { useState, useEffect } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  useEffect(() => {
    const checkState = async () => {
      if (window.electronAPI?.windowIsMaximized) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
      if (window.electronAPI?.windowIsAlwaysOnTop) {
        const onTop = await window.electronAPI.windowIsAlwaysOnTop();
        setIsAlwaysOnTop(onTop);
      }
    };
    checkState();

    // 监听窗口大小变化
    const handleResize = () => checkState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => window.electronAPI?.windowMinimize();
  const handleMaximize = async () => {
    await window.electronAPI?.windowMaximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.electronAPI?.windowClose();
  const handleToggleAlwaysOnTop = async () => {
    if (window.electronAPI?.windowSetAlwaysOnTop) {
      const result = await window.electronAPI.windowSetAlwaysOnTop(!isAlwaysOnTop);
      setIsAlwaysOnTop(result);
    }
  };

  return (
    <div className="h-8 bg-theme-sidebar flex items-center justify-between select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* 左侧：应用图标和标题 */}
      <div className="flex items-center gap-2 px-3">
        <svg className="w-4 h-4 text-theme-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.6 1.2 1.3v3.5c0 .6-.6 1.2-1.3 1.2H9.2c-.6 0-1.2-.6-1.2-1.3v-3.5c0-.6.6-1.2 1.2-1.2V9.5C9.2 8.1 10.6 7 12 7zm0 1.2c-.8 0-1.5.7-1.5 1.3V11h3V9.5c0-.6-.7-1.3-1.5-1.3z"/>
        </svg>
        <span className="text-xs text-theme-secondary font-medium">密码管理器</span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* 置顶按钮 */}
        <button
          onClick={handleToggleAlwaysOnTop}
          className={`w-11 h-full flex items-center justify-center transition-colors ${
            isAlwaysOnTop 
              ? 'text-theme-primary bg-theme-primary/10' 
              : 'text-theme-secondary hover:bg-white/10'
          }`}
          title={isAlwaysOnTop ? '取消置顶' : '置顶窗口'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isAlwaysOnTop ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            )}
          </svg>
        </button>
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-theme-secondary hover:bg-white/10 transition-colors"
          title="最小化"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 1">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center text-theme-secondary hover:bg-white/10 transition-colors"
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 10 10">
              <path d="M2 0h6v6H2zM0 2h6v6H0z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-theme-secondary hover:bg-red-500 hover:text-white transition-colors"
          title="关闭"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 10">
            <path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
