/**
 * Quick Entry Form Component
 * 快速录入表单组件 - 用于快速录入账号密码
 */

import { useState, useEffect, useCallback } from 'react';
import { createEntry, generatePassword } from '../../utils/api';
import { useVaultStore } from '../../stores/vaultStore';
import type { PasswordConfig, PasswordEntry } from '../../types/electron';

interface QuickEntryData {
  siteName: string;
  username: string;
  password: string;
  category?: string;
  notes?: string;
}

export default function QuickEntryForm() {
  const { addEntry, categories } = useVaultStore();
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 检查密码库状态
  useEffect(() => {
    const checkVaultStatus = async () => {
      try {
        // 调用主进程检查密码库是否已解锁
        const unlocked = await window.electronAPI?.isVaultUnlocked?.();
        console.log('Quick entry: vault unlocked status =', unlocked);
        setIsVaultLocked(!unlocked);
      } catch (err) {
        console.error('Quick entry: failed to check vault status', err);
        setIsVaultLocked(true);
      } finally {
        setIsChecking(false);
      }
    };
    checkVaultStatus();
  }, []);

  // 监听预填充数据
  useEffect(() => {
    const handlePrefill = (_event: any, data: Partial<QuickEntryData>) => {
      if (data.siteName) setSiteName(data.siteName);
      if (data.username) setUsername(data.username);
      if (data.password) setPassword(data.password);
    };

    // @ts-ignore - window.electronAPI 在 preload 中定义
    window.electronAPI?.on?.('quick-entry:prefill', handlePrefill);

    return () => {
      // @ts-ignore
      window.electronAPI?.off?.('quick-entry:prefill', handlePrefill);
    };
  }, []);

  // 生成密码
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

  // 保存凭证
  const handleSave = async () => {
    setError('');
    
    if (!siteName.trim()) {
      setError('请输入网站/应用名称');
      return;
    }

    if (!username.trim() && !password.trim()) {
      setError('请输入用户名或密码');
      return;
    }

    setIsLoading(true);
    try {
      const id = await createEntry({
        title: siteName.trim(),
        username: username.trim(),
        password: password,
        categoryId: categoryId || undefined,
        tags: [],
        favorite: false,
      });

      const newEntry: PasswordEntry = {
        id,
        title: siteName.trim(),
        username: username.trim(),
        password: password,
        categoryId: categoryId || undefined,
        tags: [],
        favorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      addEntry(newEntry);
      setSuccess(true);
      
      // 1秒后关闭窗口
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      setError((err as Error).message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 关闭窗口
  const handleClose = () => {
    // 使用 close 而不是 hide，确保窗口真正关闭
    // @ts-ignore
    window.electronAPI?.quickEntryClose?.();
  };

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  }, [siteName, username, password]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 检查中
  if (isChecking) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-theme-bg p-4">
        <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-theme-secondary text-sm">检查密码库状态...</p>
      </div>
    );
  }

  // 密码库未解锁
  if (isVaultLocked) {
    return (
      <div className="h-full flex flex-col bg-theme-bg">
        {/* 标题栏 */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-theme"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <span className="text-theme font-medium">快速录入</span>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-theme-card rounded transition-colors text-theme-secondary hover:text-theme"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* 提示内容 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-theme text-lg font-medium mb-2">密码库已锁定</p>
          <p className="text-theme-secondary text-sm text-center">请先在主窗口解锁密码库后再使用快速录入功能</p>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 text-sm bg-theme-primary hover:opacity-90 text-white font-medium rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-theme-bg p-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-theme text-lg font-medium">保存成功</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-theme-bg">
      {/* 标题栏 - 可拖动 */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-theme"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-theme font-medium">快速录入</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-theme-card rounded transition-colors text-theme-secondary hover:text-theme"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* 网站/应用名称 */}
        <div>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-3 py-2 input-theme rounded-lg text-sm"
            placeholder="网站/应用名称"
            autoFocus
          />
        </div>

        {/* 用户名 */}
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 input-theme rounded-lg text-sm"
            placeholder="用户名/邮箱/手机号"
          />
        </div>

        {/* 密码 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-theme-card rounded-lg border border-theme">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-3 py-2 bg-transparent text-theme text-sm font-mono border-none"
              placeholder="密码"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-theme-secondary hover:text-theme transition-colors"
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
          </div>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
            title="生成密码"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 分类选择 */}
        {categories.length > 0 && (
          <div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 input-theme rounded-lg text-sm"
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-theme">
        <span className="text-xs text-theme-secondary">
          Ctrl+Enter 保存 · Esc 关闭
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-1.5 text-sm bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
