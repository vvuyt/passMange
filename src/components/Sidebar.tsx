import { useState, useEffect, useCallback } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { createCategory, deleteCategory, updateCategory, syncGetAuthState, syncBindQuark, syncUnbindQuark, syncUpload, syncDownload, syncConfirmRestore, type SyncAuthState } from '../utils/api';

interface Props {
  onLock: () => void;
  onOpenSettings?: () => void;
  onOpenGenerator?: () => void;
  onOpenImport?: () => void;
}

// 分类图标配置 - SVG 图标
const CATEGORY_ICON_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'folder': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    color: '#6b7280'
  },
  'globe': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
    color: '#3b82f6'
  },
  'credit-card': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    color: '#f59e0b'
  },
  'building': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    color: '#10b981'
  },
  'mail': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    color: '#ef4444'
  },
  'game': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    color: '#8b5cf6'
  },
  'briefcase': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    color: '#64748b'
  },
  'lock': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    color: '#ec4899'
  },
  'phone': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    color: '#06b6d4'
  },
  'cart': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
    color: '#f97316'
  },
  'music': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
    color: '#a855f7'
  },
  'tv': {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    color: '#14b8a6'
  },
};

// 图标 ID 列表
const CATEGORY_ICONS = Object.keys(CATEGORY_ICON_CONFIG);

// 渲染分类图标
function CategoryIcon({ iconId, size = 'md' }: { iconId: string; size?: 'sm' | 'md' }) {
  const config = CATEGORY_ICON_CONFIG[iconId] || CATEGORY_ICON_CONFIG['folder'];
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div 
      className={`${sizeClass} rounded flex items-center justify-center flex-shrink-0`}
      style={{ color: config.color }}
    >
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {config.icon}
      </svg>
    </div>
  );
}

// 标签颜色 - 暂时隐藏功能
// const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Sidebar({ onLock, onOpenSettings, onOpenGenerator, onOpenImport }: Props) {
  const { categories, selectedCategoryId, selectedTagId, setSelectedCategoryId, searchQuery, setSearchQuery, setCategories } = useVaultStore();
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('folder');
  
  // 云同步状态
  const [authState, setAuthState] = useState<SyncAuthState>({ isAuthenticated: false });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'uploading' | 'downloading' | 'restoring'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  
  // 标签相关状态 - 暂时隐藏功能，保留代码
  // const [isAddingTag, setIsAddingTag] = useState(false);
  // const [newTagName, setNewTagName] = useState('');
  // const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0]);

  // 加载云同步状态
  const loadSyncState = useCallback(async () => {
    try {
      const auth = await syncGetAuthState();
      setAuthState(auth);
    } catch (err) {
      console.error('加载同步状态失败:', err);
    }
  }, []);

  useEffect(() => {
    loadSyncState();
  }, [loadSyncState]);

  // 绑定夸克云盘
  const handleBindQuark = async () => {
    setSyncError(null);
    try {
      const result = await syncBindQuark();
      if (result.success) {
        await loadSyncState();
      } else {
        setSyncError(result.error || '绑定失败');
      }
    } catch (err) {
      setSyncError((err as Error).message);
    }
  };

  // 解绑夸克云盘
  const handleUnbindQuark = async () => {
    if (!confirm('确定要解绑夸克云盘吗？')) return;
    setSyncError(null);
    try {
      await syncUnbindQuark();
      await loadSyncState();
    } catch (err) {
      setSyncError((err as Error).message);
    }
  };

  // 上传到云端
  const handleUpload = async () => {
    setShowUploadConfirm(true);
  };

  // 确认上传
  const handleConfirmUpload = async () => {
    setShowUploadConfirm(false);
    setSyncError(null);
    setSyncStatus('uploading');
    try {
      const result = await syncUpload();
      if (!result.success) {
        setSyncError(result.error || '上传失败');
      }
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setSyncStatus('idle');
    }
  };

  // 从云端下载
  const handleDownload = async () => {
    setSyncError(null);
    setSyncStatus('downloading');
    try {
      const result = await syncDownload();
      if (result.success) {
        if (result.needsRestore) {
          setShowRestoreDialog(true);
        }
      } else {
        setSyncError(result.error || '下载失败');
      }
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setSyncStatus('idle');
    }
  };

  // 确认恢复
  const handleConfirmRestore = async () => {
    if (!restorePassword) {
      setSyncError('请输入主密码');
      return;
    }
    setSyncError(null);
    setSyncStatus('restoring');
    try {
      const result = await syncConfirmRestore(restorePassword);
      if (result.success) {
        setShowRestoreDialog(false);
        setRestorePassword('');
        // 恢复成功后刷新数据，不需要重新登录
        const { refreshAll } = useVaultStore.getState();
        await refreshAll();
      } else {
        setSyncError(result.error || '恢复失败');
      }
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setSyncStatus('idle');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const id = await createCategory({ 
        name: newCategoryName.trim(), 
        icon: selectedIcon,
        sortOrder: categories.length,
        isDefault: false
      });
      setCategories([...categories, { 
        id, 
        name: newCategoryName.trim(), 
        icon: selectedIcon,
        sortOrder: categories.length,
        isDefault: false
      }]);
      setNewCategoryName('');
      setSelectedIcon('folder');
      setIsAddingCategory(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个分类吗？分类下的密码将移至"未分类"')) return;
    
    try {
      await deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleStartEdit = (cat: { id: string; name: string; icon?: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategoryId(cat.id);
    setEditingName(cat.name);
    setEditingIcon(cat.icon || 'folder');
  };

  const handleSaveEdit = async () => {
    if (!editingCategoryId || !editingName.trim()) return;
    
    const cat = categories.find(c => c.id === editingCategoryId);
    if (!cat) return;

    try {
      await updateCategory({ ...cat, name: editingName.trim(), icon: editingIcon });
      setCategories(categories.map(c => 
        c.id === editingCategoryId ? { ...c, name: editingName.trim(), icon: editingIcon } : c
      ));
      setEditingCategoryId(null);
      setEditingName('');
      setEditingIcon('folder');
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  // 标签操作 - 暂时隐藏功能，保留代码
  /* const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const id = await createTag({ name: newTagName.trim(), color: selectedTagColor });
      setTags([...tags, { id, name: newTagName.trim(), color: selectedTagColor }]);
      setNewTagName('');
      setSelectedTagColor(TAG_COLORS[0]);
      setIsAddingTag(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteTag = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个标签吗？')) return;
    
    try {
      await deleteTag(id);
      setTags(tags.filter(t => t.id !== id));
      if (selectedTagId === id) {
        setSelectedTagId(null);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  }; */

  return (
    <div className="h-full bg-theme-sidebar flex flex-col overflow-hidden">
      {/* 搜索框 */}
      <div className="p-4 flex-shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索密码..."
          className="w-full px-3 py-2 input-theme rounded-md text-sm transition-all"
        />
      </div>

      {/* 分类列表 - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">分类</h3>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="text-theme-secondary hover:text-theme text-lg leading-none transition-transform hover:scale-110"
            title="添加分类"
          >
            +
          </button>
        </div>

        {/* 添加分类表单 */}
        {isAddingCategory && (
          <div className="px-2 pb-2 dropdown-enter">
            <div className="bg-theme-card rounded-md p-2 space-y-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="分类名称"
                className="w-full px-2 py-1 input-theme rounded text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') setIsAddingCategory(false);
                }}
              />
              <div className="flex flex-wrap gap-1">
                {CATEGORY_ICONS.map((iconId) => (
                  <button
                    key={iconId}
                    onClick={() => setSelectedIcon(iconId)}
                    className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                      selectedIcon === iconId 
                        ? 'bg-theme-primary/20 ring-2 ring-theme-primary' 
                        : 'bg-theme-card hover:bg-theme-card/80'
                    }`}
                  >
                    <CategoryIcon iconId={iconId} size="sm" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 px-2 py-1 btn-primary text-white text-xs rounded"
                >
                  添加
                </button>
                <button
                  onClick={() => setIsAddingCategory(false)}
                  className="flex-1 px-2 py-1 bg-theme-card hover:opacity-80 text-theme text-xs rounded"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <nav className="space-y-1 px-2">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2.5 ${
              !selectedCategoryId && !selectedTagId
                ? 'sidebar-selected font-medium'
                : 'text-theme-secondary hover:bg-hover'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            全部
          </button>
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              className={`group flex items-center rounded-lg transition-all duration-200 ${
                selectedCategoryId === cat.id
                  ? 'sidebar-selected font-medium'
                  : 'text-theme-secondary hover:bg-hover'
              }`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {editingCategoryId === cat.id ? (
                <div className="flex-1 p-2 space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-2 py-1.5 bg-theme-bg border border-theme-primary/50 text-sm rounded-md text-theme focus:outline-none focus:border-theme-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') {
                        setEditingCategoryId(null);
                        setEditingIcon('folder');
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {CATEGORY_ICONS.map((iconId) => (
                      <button
                        key={iconId}
                        onClick={() => setEditingIcon(iconId)}
                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                          editingIcon === iconId 
                            ? 'bg-theme-primary/20 ring-1 ring-theme-primary' 
                            : 'bg-theme-bg hover:bg-theme-card'
                        }`}
                      >
                        <CategoryIcon iconId={iconId} size="sm" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-2 py-1 bg-theme-primary hover:opacity-90 text-white text-xs rounded"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditingIcon('folder');
                      }}
                      className="flex-1 px-2 py-1 bg-theme-bg hover:bg-theme-card text-theme text-xs rounded border border-theme"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="flex-1 text-left px-3 py-2 text-sm flex items-center gap-2.5"
                  >
                    <CategoryIcon iconId={cat.icon || 'folder'} size="sm" />
                    <span>{cat.name}</span>
                  </button>
                  <div className="hidden group-hover:flex items-center pr-2 gap-0.5">
                    <button
                      onClick={(e) => handleStartEdit(cat, e)}
                      className="p-1.5 text-theme-secondary hover:text-theme hover:bg-theme-card rounded transition-colors"
                      title="编辑"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteCategory(cat.id, e)}
                      className="p-1.5 text-theme-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="删除"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        {/* 标签列表 - 暂时隐藏 */}
        {/* <div className="px-4 py-2 mt-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">标签</h3>
          <button
            onClick={() => setIsAddingTag(true)}
            className="text-theme-secondary hover:text-theme text-lg leading-none"
            title="添加标签"
          >
            +
          </button>
        </div> */}

        {/* 添加标签表单 - 暂时隐藏 */}
        {/* {isAddingTag && (
          <div className="px-2 pb-2">
            <div className="bg-theme-card rounded-md p-2 space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="标签名称"
                className="w-full px-2 py-1 input-theme rounded text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
              />
              <div className="flex flex-wrap gap-1">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedTagColor(color)}
                    className={`w-6 h-6 rounded-full ${
                      selectedTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTag}
                  className="flex-1 px-2 py-1 btn-primary text-white text-xs rounded"
                >
                  添加
                </button>
                <button
                  onClick={() => setIsAddingTag(false)}
                  className="flex-1 px-2 py-1 bg-theme-card hover:opacity-80 text-theme text-xs rounded"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )} */}

        {/* 标签列表 - 暂时隐藏 */}
        {/* <nav className="space-y-1 px-2">
          {tags.length === 0 && !isAddingTag && (
            <p className="px-3 py-2 text-xs text-theme-secondary">暂无标签</p>
          )}
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`group flex items-center rounded-md transition-colors ${
                selectedTagId === tag.id
                  ? 'bg-theme-card text-theme'
                  : 'text-theme-secondary hover:bg-theme-card'
              }`}
            >
              <button
                onClick={() => setSelectedTagId(tag.id)}
                className="flex-1 text-left px-3 py-2 text-sm flex items-center gap-2"
              >
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                />
                {tag.name}
              </button>
              <button
                onClick={(e) => handleDeleteTag(tag.id, e)}
                className="hidden group-hover:block pr-2 text-theme-secondary hover:text-red-400 text-xs"
                title="删除"
              >
                🗑️
              </button>
            </div>
          ))}
        </nav> */}
      </div>

      {/* 云同步区域 */}
      <div className="px-4 py-2 border-t border-theme flex-shrink-0">
        {syncError && (
          <div className="mb-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-400 text-xs">
            {syncError}
          </div>
        )}
        
        {authState.isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {authState.nickname?.charAt(0) || '夸'}
              </div>
              <div className="flex-1 min-w-0 text-xs text-theme truncate">{authState.nickname}</div>
              <button
                onClick={handleUnbindQuark}
                className="p-1 text-theme-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                title="解绑"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={syncStatus !== 'idle'}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
              >
                {syncStatus === 'uploading' ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
                上传
              </button>
              <button
                onClick={handleDownload}
                disabled={syncStatus !== 'idle'}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
              >
                {syncStatus === 'downloading' ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                )}
                下载
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleBindQuark}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-xs font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            绑定夸克云盘
          </button>
        )}
      </div>

      {/* 底部操作 */}
      <div className="px-3 py-2 border-t border-theme flex-shrink-0">
        <div className="flex items-center justify-around">
          {onOpenGenerator && (
            <button
              onClick={onOpenGenerator}
              className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-all duration-200 hover:scale-110 btn-press"
              title="密码生成器"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
          )}
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-all duration-200 hover:scale-110 btn-press"
              title="导入密码"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-all duration-200 hover:scale-110 btn-press"
              title="设置"
            >
              <svg className="w-5 h-5 transition-transform duration-300 hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onLock}
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-all duration-200 hover:scale-110 btn-press"
            title="锁定"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 恢复确认对话框 */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-gray-800 rounded-lg w-full max-w-sm mx-4 p-4 space-y-4 modal-content">
            <h3 className="text-lg font-semibold text-white">确认恢复数据</h3>
            <p className="text-sm text-gray-400">
              云端数据将覆盖本地数据，请输入主密码确认：
            </p>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="主密码"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {syncError && <p className="text-sm text-red-400">{syncError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRestoreDialog(false);
                  setRestorePassword('');
                  setSyncError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={syncStatus === 'restoring'}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md"
              >
                {syncStatus === 'restoring' ? '恢复中...' : '确认恢复'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 上传确认对话框 */}
      {showUploadConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-gray-800 rounded-lg w-full max-w-sm mx-4 p-4 space-y-4 modal-content">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">确认上传</h3>
            </div>
            <p className="text-sm text-gray-400">
              上传将覆盖云端已有的备份数据，此操作不可撤销。确定要继续吗？
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                确认上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
