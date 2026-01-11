import { useState, useEffect, useCallback } from 'react';
import { BackupManager } from '../backup';
import TotpSettings from './TotpSettings';
import DestroyVaultDialog from './DestroyVaultDialog';
import SyncSettings from './SyncSettings';
import SecurityInfoSection from './SecurityInfoSection';
import ShortcutSettings from './ShortcutSettings';
import OCRSettings from './OCRSettings';
import { getAutoLockTimeout, setAutoLockTimeout } from '../../utils/api';

interface Theme {
  id: string;
  name: string;
  primary: string;
  background: string;
  sidebar: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
}

// 自定义下拉组件
interface CustomSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
}

function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-theme-card border border-theme rounded-lg text-theme text-sm flex items-center gap-2 min-w-[100px] justify-between"
      >
        <span>{selectedOption?.label}</span>
        <svg className={`w-3 h-3 text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 bg-theme-card border border-theme rounded-lg shadow-lg z-50 min-w-[100px] overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-theme-bg transition-colors ${
                  value === option.value ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const THEMES: Theme[] = [
  {
    id: 'dark',
    name: '深色',
    primary: '#3b82f6',
    background: '#111827',
    sidebar: '#1f2937',
    card: '#1f2937',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
  },
  {
    id: 'light',
    name: '浅色',
    primary: '#3b82f6',
    background: '#f3f4f6',
    sidebar: '#ffffff',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  },
  {
    id: 'blue',
    name: '深蓝',
    primary: '#60a5fa',
    background: '#0f172a',
    sidebar: '#1e293b',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
  },
  {
    id: 'purple',
    name: '紫色',
    primary: '#a78bfa',
    background: '#1a1625',
    sidebar: '#2d2640',
    card: '#2d2640',
    text: '#f5f3ff',
    textSecondary: '#a5a3b8',
    border: '#3d3655',
  },
  {
    id: 'green',
    name: '绿色',
    primary: '#34d399',
    background: '#0f1a14',
    sidebar: '#1a2e23',
    card: '#1a2e23',
    text: '#ecfdf5',
    textSecondary: '#9ca3af',
    border: '#2d4a3e',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [customPrimary, setCustomPrimary] = useState('#3b82f6');
  const [showBackup, setShowBackup] = useState(false);
  const [showTotp, setShowTotp] = useState(false);
  const [showDestroy, setShowDestroy] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(30);

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showBackup && !showTotp && !showDestroy && !showSync && !showShortcuts && !showOCR) {
      onClose();
    }
  }, [onClose, showBackup, showTotp, showDestroy, showSync, showShortcuts, showOCR]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedPrimary = localStorage.getItem('primaryColor');
    const savedClipboardClear = localStorage.getItem('clipboardClearSeconds');
    setCurrentTheme(savedTheme);
    if (savedPrimary) setCustomPrimary(savedPrimary);
    if (savedClipboardClear) setClipboardClearSeconds(parseInt(savedClipboardClear, 10));
    applyTheme(savedTheme, savedPrimary);
    getAutoLockTimeout().then(setAutoLockMinutes).catch(console.error);
  }, []);

  const applyTheme = (themeId: string, customColor?: string | null) => {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', customColor || theme.primary);
    root.style.setProperty('--color-background', theme.background);
    root.style.setProperty('--color-sidebar', theme.sidebar);
    root.style.setProperty('--color-card', theme.card);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-text-secondary', theme.textSecondary);
    root.style.setProperty('--color-border', theme.border);
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('theme', themeId);
    applyTheme(themeId, customPrimary);
  };

  const handlePrimaryColorChange = (color: string) => {
    setCustomPrimary(color);
    localStorage.setItem('primaryColor', color);
    applyTheme(currentTheme, color);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-card rounded-xl w-full max-w-md shadow-2xl max-h-[calc(100vh-4rem)] flex flex-col border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* 主题选择 */}
          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">外观</h3>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    currentTheme === theme.id
                      ? 'border-theme-primary ring-2 ring-theme-primary/20'
                      : 'border-transparent hover:border-theme'
                  }`}
                  title={theme.name}
                >
                  <div
                    className="w-full aspect-square rounded-md mb-1.5 overflow-hidden flex"
                    style={{ backgroundColor: theme.background }}
                  >
                    <div className="w-1/3 h-full" style={{ backgroundColor: theme.sidebar }} />
                  </div>
                  <span className="text-xs text-theme-secondary">{theme.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 主色调 */}
          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">主色调</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={customPrimary}
                  onChange={(e) => handlePrimaryColorChange(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-theme"
                />
              </div>
              <div className="flex gap-1.5 flex-1">
                {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handlePrimaryColorChange(color)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      customPrimary === color ? 'ring-2 ring-white ring-offset-2 ring-offset-theme-card scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 安全设置 */}
          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">安全</h3>
            <div className="space-y-3">
              {/* 安全信息 */}
              <SecurityInfoSection />
              
              <div className="flex items-center justify-between p-3 bg-theme-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-theme">自动锁定</span>
                </div>
                <CustomSelect
                  value={autoLockMinutes}
                  onChange={(value) => {
                    setAutoLockMinutes(value);
                    setAutoLockTimeout(value).catch(console.error);
                  }}
                  options={[
                    { value: 1, label: '1 分钟' },
                    { value: 5, label: '5 分钟' },
                    { value: 10, label: '10 分钟' },
                    { value: 15, label: '15 分钟' },
                    { value: 30, label: '30 分钟' },
                    { value: 0, label: '从不' },
                  ]}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-theme-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm text-theme">剪贴板清除</span>
                </div>
                <CustomSelect
                  value={clipboardClearSeconds}
                  onChange={(value) => {
                    setClipboardClearSeconds(value);
                    localStorage.setItem('clipboardClearSeconds', value.toString());
                  }}
                  options={[
                    { value: 15, label: '15 秒' },
                    { value: 30, label: '30 秒' },
                    { value: 60, label: '60 秒' },
                    { value: 0, label: '从不' },
                  ]}
                />
              </div>

              <button
                onClick={() => setShowTotp(true)}
                className="w-full flex items-center justify-between p-3 bg-theme-bg hover:bg-theme-card rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm text-theme">二次验证 (TOTP)</span>
                </div>
                <svg className="w-4 h-4 text-theme-secondary group-hover:text-theme transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>

          {/* 快捷键和 OCR 设置 */}
          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">快捷功能</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowShortcuts(true)}
                className="w-full flex items-center justify-between p-3 bg-theme-bg hover:bg-theme-card rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="text-sm text-theme">快捷键设置</span>
                </div>
                <svg className="w-4 h-4 text-theme-secondary group-hover:text-theme transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setShowOCR(true)}
                className="w-full flex items-center justify-between p-3 bg-theme-bg hover:bg-theme-card rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-theme">OCR 识别设置</span>
                </div>
                <svg className="w-4 h-4 text-theme-secondary group-hover:text-theme transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>

          {/* 数据管理 */}
          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">数据</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowSync(true)}
                className="w-full flex items-center justify-between p-3 bg-theme-bg hover:bg-theme-card rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <span className="text-sm text-theme">云同步设置</span>
                </div>
                <svg className="w-4 h-4 text-theme-secondary group-hover:text-theme transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setShowBackup(true)}
                className="w-full flex items-center justify-between p-3 bg-theme-bg hover:bg-theme-card rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-sm text-theme">备份管理</span>
                </div>
                <svg className="w-4 h-4 text-theme-secondary group-hover:text-theme transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>

          {/* 危险区域 */}
          <section>
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">危险区域</h3>
            <button
              onClick={() => setShowDestroy(true)}
              className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div className="text-left">
                  <span className="text-sm text-red-400 block">销毁密码库</span>
                  <span className="text-xs text-red-400/60">删除所有数据，此操作不可逆</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
        </div>

        {/* 底部 */}
        <div className="px-5 py-4 border-t border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>

      <BackupManager isOpen={showBackup} onClose={() => setShowBackup(false)} />
      <TotpSettings isOpen={showTotp} onClose={() => setShowTotp(false)} />
      <DestroyVaultDialog isOpen={showDestroy} onClose={() => setShowDestroy(false)} />
      <SyncSettings isOpen={showSync} onClose={() => setShowSync(false)} />
      <ShortcutSettings isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <OCRSettings isOpen={showOCR} onClose={() => setShowOCR(false)} />
    </div>
  );
}
