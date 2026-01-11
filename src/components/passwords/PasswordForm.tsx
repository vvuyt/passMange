import { useState, useEffect, useRef, useCallback } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { createEntry, updateEntry, generatePassword, getSmartIcon } from '../../utils/api';
import Avatar from '../common/Avatar';
import type { PasswordEntry, PasswordConfig } from '../../types/electron';

// 分类图标配置 - 与 Sidebar 保持一致
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

interface Props {
  entryId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export default function PasswordForm({ entryId, onClose, onSaved }: Props) {
  const { entries, categories, addEntry, updateEntry: updateStoreEntry } = useVaultStore();
  const existingEntry = entryId ? entries.find((e) => e.id === entryId) : null;

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [favorite, setFavorite] = useState(false);
  const [icon, setIcon] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const iconFetchedRef = useRef(false); // 防止重复获取

  // 自动获取图标
  const fetchSmartIcon = useCallback(async (titleVal: string, urlVal: string) => {
    // 如果已经有图标或正在获取，跳过
    if (icon || isFetchingIcon || iconFetchedRef.current) return;
    // 需要有标题或网址
    if (!titleVal && !urlVal) return;
    
    setIsFetchingIcon(true);
    try {
      const result = await getSmartIcon(titleVal, urlVal);
      if (result.icon && !icon) {
        setIcon(result.icon);
        iconFetchedRef.current = true;
      }
    } catch (err) {
      console.error('获取图标失败:', err);
    } finally {
      setIsFetchingIcon(false);
    }
  }, [icon, isFetchingIcon]);

  // 当网址变化时尝试获取图标（防抖）
  useEffect(() => {
    if (existingEntry) return; // 编辑模式不自动获取
    if (!url || icon) return;
    
    const timer = setTimeout(() => {
      fetchSmartIcon(title, url);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [url, title, icon, existingEntry, fetchSmartIcon]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (existingEntry) {
      setTitle(existingEntry.title);
      setUsername(existingEntry.username);
      setPassword(existingEntry.password);
      setUrl(existingEntry.url || '');
      setNotes(existingEntry.notes || '');
      setCategoryId(existingEntry.categoryId || '');
      setFavorite(existingEntry.favorite);
      setIcon(existingEntry.icon || '');
    }
  }, [existingEntry]);

  const handleGeneratePassword = async () => {
    const config: PasswordConfig = {
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: true,
      excludeAmbiguous: true,
    };
    const generated = await generatePassword(config);
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入标题');
      return;
    }

    setIsLoading(true);
    try {
      if (existingEntry) {
        const updated: PasswordEntry = {
          ...existingEntry,
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          icon: icon || undefined,
          favorite,
          updatedAt: new Date().toISOString(),
        };
        await updateEntry(updated);
        updateStoreEntry(updated);
        onSaved(existingEntry.id);
      } else {
        const id = await createEntry({
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          icon: icon || undefined,
          tags: [],
          favorite,
        });
        const newEntry: PasswordEntry = {
          id,
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          icon: icon || undefined,
          tags: [],
          favorite,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addEntry(newEntry);
        onSaved(id);
      }
    } catch (err) {
      setError((err as Error).message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between p-4 border-b border-theme flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-card rounded-lg transition-colors text-theme-secondary hover:text-theme"
            title="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-theme-secondary">
            {existingEntry ? '编辑' : '新建'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-1.5 text-sm bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          {/* 头像和标题 */}
          <div className="flex items-center gap-4">
            <Avatar
              title={title || '新密码'}
              icon={icon}
              size="lg"
              editable
              onIconChange={setIcon}
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-semibold text-theme bg-transparent border-none outline-none placeholder:text-theme-secondary"
                placeholder="输入标题"
                autoFocus
              />
              <p className="text-xs text-theme-secondary mt-1">点击头像可自定义图标</p>
            </div>
          </div>

          {/* 字段列表 */}
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">用户名</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 input-theme rounded-lg"
                placeholder="用户名或邮箱"
              />
            </div>

            {/* 密码 */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">密码</span>
              </div>
              <div className="flex items-center bg-theme-card rounded-lg border border-theme transition-colors focus-within:border-theme-primary">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-transparent text-theme font-mono border-none"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-theme-secondary hover:text-theme transition-colors"
                  title={showPassword ? '隐藏' : '显示'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-r-lg transition-colors"
                  title="生成密码"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 网址 */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">网址</span>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2.5 input-theme rounded-lg"
                placeholder="https://example.com"
              />
            </div>

            {/* 分类 */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">分类</span>
              </div>
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full px-3 py-2.5 input-theme rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {categoryId ? (
                      <>
                        <CategoryIcon iconId={categories.find(c => c.id === categoryId)?.icon || 'folder'} size="sm" />
                        <span className="text-theme">{categories.find(c => c.id === categoryId)?.name}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span className="text-theme-secondary">未分类</span>
                      </>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-theme-secondary transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-theme-card border border-theme rounded-lg shadow-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId('');
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-theme-bg transition-colors ${
                          !categoryId ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme'
                        }`}
                      >
                        <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span>未分类</span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(cat.id);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-theme-bg transition-colors ${
                            categoryId === cat.id ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme'
                          }`}
                        >
                          <CategoryIcon iconId={cat.icon || 'folder'} size="sm" />
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 备注 */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">备注</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 input-theme rounded-lg resize-none"
                placeholder="可选备注信息"
              />
            </div>

            {/* 收藏 */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`p-2 rounded-lg transition-colors ${
                  favorite 
                    ? 'text-yellow-400 bg-yellow-500/10' 
                    : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                }`}
                title={favorite ? '取消收藏' : '收藏'}
              >
                <svg className="w-5 h-5" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
              <span className="text-sm text-theme-secondary">
                {favorite ? '已收藏' : '添加到收藏'}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
