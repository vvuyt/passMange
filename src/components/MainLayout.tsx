import { useState, useRef, useCallback, useEffect } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { useSelectionStore } from '../stores/selection-store';
import { lockVault } from '../utils/api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Sidebar from './Sidebar';
import PasswordList from './passwords/PasswordList';
import PasswordDetail from './passwords/PasswordDetail';
import PasswordForm from './passwords/PasswordForm';
import BatchActionToolbar from './passwords/BatchActionToolbar';
import SettingsModal from './settings/SettingsModal';
import { PasswordGenerator } from './generator';
import { ImportWizard } from './import';

// 简单的拖动 hook
function useDraggableWidth(key: string, initial: number, min: number, max: number) {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      const w = parseInt(saved, 10);
      if (!isNaN(w) && w >= min && w <= max) return w;
    }
    return initial;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.max(min, Math.min(max, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(key, width.toString());
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [key, min, max, width]);

  return { width, onMouseDown };
}

export default function MainLayout() {
  const { lock } = useVaultStore();
  const { isSelectionMode, clearSelection } = useSelectionStore();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 可拖动宽度
  const sidebar = useDraggableWidth('sidebar-width', 240, 180, 400);
  const list = useDraggableWidth('list-width', 320, 200, 600);

  const handleLock = async () => {
    await lockVault();
    lock();
  };

  const handleCreateNew = () => {
    setSelectedEntryId(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onNew: handleCreateNew,
    onLock: handleLock,
  });

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCloseForm = () => { setIsCreating(false); setIsEditing(false); };

  const showDetail = selectedEntryId || isCreating || isEditing;

  return (
    <div className="h-full bg-theme-bg flex overflow-hidden">
      {/* 侧边栏 */}
      <div style={{ width: sidebar.width, minWidth: sidebar.width }} className="flex-shrink-0 h-full bg-theme-sidebar">
        <Sidebar 
          onLock={handleLock} 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenGenerator={() => setShowGenerator(true)}
          onOpenImport={() => setShowImport(true)}
        />
      </div>
      
      {/* 侧边栏拖动条 */}
      <div
        onMouseDown={sidebar.onMouseDown}
        style={{ 
          width: '4px', 
          minWidth: '4px',
          backgroundColor: 'var(--color-border)',
          cursor: 'col-resize',
          flexShrink: 0
        }}
        className="hover:bg-blue-500 transition-colors"
        title="拖动调整侧边栏宽度"
      />

      {/* 密码列表 */}
      <div 
        style={{ width: showDetail ? list.width : undefined, minWidth: showDetail ? list.width : undefined }}
        className={`flex flex-col bg-theme-sidebar overflow-hidden flex-shrink-0 ${!showDetail ? 'flex-1' : ''}`}
      >
        {/* 批量操作工具栏 */}
        {isSelectionMode && (
          <BatchActionToolbar onOperationComplete={() => clearSelection()} />
        )}
        
        <div className="p-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-theme">密码</h2>
            <button
              onClick={handleCreateNew}
              className="px-3 py-1 btn-primary text-white text-sm rounded-md transition-colors"
              title="新建 (Ctrl+N)"
            >
              + 新建
            </button>
          </div>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索... (Ctrl+F)"
              className="w-full px-3 py-2 pl-9 bg-theme-bg border border-theme rounded-md text-theme text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => useVaultStore.getState().setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary">🔍</span>
          </div>
        </div>
        <PasswordList selectedId={selectedEntryId} onSelect={handleSelectEntry} />
      </div>

      {/* 密码列表拖动条 */}
      {showDetail && (
        <div
          onMouseDown={list.onMouseDown}
          style={{ 
            width: '4px', 
            minWidth: '4px',
            backgroundColor: 'var(--color-border)',
            cursor: 'col-resize',
            flexShrink: 0
          }}
          className="hover:bg-blue-500 transition-colors"
          title="拖动调整列表宽度"
        />
      )}

      {/* 详情/表单区 */}
      {showDetail && (
        <div className="flex-1 bg-theme-bg overflow-y-auto custom-scrollbar min-w-[300px] animate-fade-in">
          {isCreating || isEditing ? (
            <PasswordForm
              entryId={isEditing ? selectedEntryId : null}
              onClose={handleCloseForm}
              onSaved={(id: string) => { setSelectedEntryId(id); handleCloseForm(); }}
            />
          ) : selectedEntryId ? (
            <PasswordDetail
              entryId={selectedEntryId}
              onEdit={handleEdit}
              onDeleted={() => setSelectedEntryId(null)}
              onBack={() => setSelectedEntryId(null)}
            />
          ) : null}
        </div>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop">
          <div className="modal-content">
            <PasswordGenerator onClose={() => setShowGenerator(false)} />
          </div>
        </div>
      )}

      <ImportWizard isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
