/**
 * Shortcut Settings Component
 * 快捷键设置组件
 * 
 * Requirements: 1.3, 1.4
 * - 1.3: WHEN a user opens the settings page, THE Global_Shortcut SHALL display a shortcut key configuration interface
 * - 1.4: THE Global_Shortcut SHALL allow users to record a custom key combination by pressing the desired keys
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getShortcutConfig,
  updateShortcut,
  setShortcutEnabled,
  resetShortcuts,
  validateShortcut,
  type ShortcutConfig,
} from '../../utils/api';

interface ShortcutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// 快捷键录制状态
interface RecordingState {
  action: 'quickEntry' | 'screenshot' | null;
  keys: Set<string>;
}

export default function ShortcutSettings({ isOpen, onClose }: ShortcutSettingsProps) {
  const [config, setConfig] = useState<ShortcutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recording, setRecording] = useState<RecordingState>({ action: null, keys: new Set() });

  // 加载配置
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    setError('');
    try {
      const cfg = await getShortcutConfig();
      setConfig(cfg);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘事件处理 - 录制快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recording.action) {
      if (e.key === 'Escape') {
        onClose();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const key = e.key;
    const newKeys = new Set(recording.keys);

    // 添加修饰键
    if (e.ctrlKey) newKeys.add('Control');
    if (e.altKey) newKeys.add('Alt');
    if (e.shiftKey) newKeys.add('Shift');
    if (e.metaKey) newKeys.add('Meta');

    // 添加主键（非修饰键）
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      newKeys.add(key.toUpperCase());
    }

    setRecording({ ...recording, keys: newKeys });
  }, [recording, onClose]);

  const handleKeyUp = useCallback(async (_e: KeyboardEvent) => {
    if (!recording.action || recording.keys.size === 0) return;

    // 检查是否有非修饰键
    const hasMainKey = Array.from(recording.keys).some(
      k => !['Control', 'Alt', 'Shift', 'Meta'].includes(k)
    );

    if (!hasMainKey) return;

    // 构建 accelerator 字符串
    const accelerator = buildAccelerator(recording.keys);
    
    try {
      // 验证快捷键
      const isValid = await validateShortcut(accelerator);
      if (!isValid) {
        setError('无效的快捷键格式');
        setRecording({ action: null, keys: new Set() });
        return;
      }

      // 更新快捷键
      const newConfig = await updateShortcut(recording.action, accelerator);
      setConfig(newConfig);
      setSuccess('快捷键已更新');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError((err as Error).message);
    }

    setRecording({ action: null, keys: new Set() });
  }, [recording]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isOpen, handleKeyDown, handleKeyUp]);

  // 构建 accelerator 字符串
  const buildAccelerator = (keys: Set<string>): string => {
    const modifiers: string[] = [];
    let mainKey = '';

    keys.forEach(key => {
      if (key === 'Control') modifiers.push('CommandOrControl');
      else if (key === 'Alt') modifiers.push('Alt');
      else if (key === 'Shift') modifiers.push('Shift');
      else if (key === 'Meta') modifiers.push('CommandOrControl');
      else mainKey = key;
    });

    return [...modifiers, mainKey].join('+');
  };

  // 开始录制
  const startRecording = (action: 'quickEntry' | 'screenshot') => {
    setRecording({ action, keys: new Set() });
    setError('');
  };

  // 取消录制
  const cancelRecording = () => {
    setRecording({ action: null, keys: new Set() });
  };

  // 切换启用状态
  const handleToggleEnabled = async () => {
    if (!config) return;
    try {
      const newConfig = await setShortcutEnabled(!config.enabled);
      setConfig(newConfig);
      setSuccess(newConfig.enabled ? '快捷键已启用' : '快捷键已禁用');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // 重置为默认
  const handleReset = async () => {
    try {
      const newConfig = await resetShortcuts();
      setConfig(newConfig);
      setSuccess('已重置为默认快捷键');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !recording.action && onClose()}
    >
      <div className="bg-theme-card rounded-xl w-full max-w-md shadow-2xl border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">快捷键设置</h2>
          </div>
          <button
            onClick={onClose}
            disabled={!!recording.action}
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-theme-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : config ? (
            <>
              {/* 启用开关 */}
              <div className="flex items-center justify-between p-3 bg-theme-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm text-theme">启用全局快捷键</span>
                </div>
                <button
                  onClick={handleToggleEnabled}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    config.enabled ? 'bg-theme-primary' : 'bg-theme-card border border-theme'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* 快速录入快捷键 */}
              <ShortcutItem
                label="快速录入"
                description="唤起快速录入窗口"
                shortcut={config.quickEntry}
                isRecording={recording.action === 'quickEntry'}
                recordingKeys={recording.keys}
                disabled={!config.enabled}
                onStartRecording={() => startRecording('quickEntry')}
                onCancelRecording={cancelRecording}
              />

              {/* 截图 OCR 快捷键 */}
              <ShortcutItem
                label="截图识别"
                description="截图并进行 OCR 识别"
                shortcut={config.screenshot}
                isRecording={recording.action === 'screenshot'}
                recordingKeys={recording.keys}
                disabled={!config.enabled}
                onStartRecording={() => startRecording('screenshot')}
                onCancelRecording={cancelRecording}
              />

              {/* 重置按钮 */}
              <button
                onClick={handleReset}
                className="w-full p-3 text-sm text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors text-center"
              >
                重置为默认快捷键
              </button>
            </>
          ) : null}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-4 border-t border-theme">
          <div className="flex items-center justify-between">
            <span className="text-xs text-theme-secondary">
              {recording.action ? '按下组合键录制快捷键' : '点击快捷键区域开始录制'}
            </span>
            <button
              onClick={onClose}
              disabled={!!recording.action}
              className="px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 快捷键项组件
interface ShortcutItemProps {
  label: string;
  description: string;
  shortcut: string;
  isRecording: boolean;
  recordingKeys: Set<string>;
  disabled: boolean;
  onStartRecording: () => void;
  onCancelRecording: () => void;
}

function ShortcutItem({
  label,
  description,
  shortcut,
  isRecording,
  recordingKeys,
  disabled,
  onStartRecording,
  onCancelRecording,
}: ShortcutItemProps) {
  const formatShortcut = (accelerator: string): string => {
    return accelerator
      .replace('CommandOrControl', 'Ctrl')
      .replace('Control', 'Ctrl')
      .replace('Meta', 'Cmd');
  };

  const formatRecordingKeys = (keys: Set<string>): string => {
    if (keys.size === 0) return '...';
    return Array.from(keys)
      .map(k => k === 'Control' ? 'Ctrl' : k === 'Meta' ? 'Cmd' : k)
      .join(' + ');
  };

  return (
    <div className={`p-3 bg-theme-bg rounded-lg ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-theme font-medium">{label}</p>
          <p className="text-xs text-theme-secondary">{description}</p>
        </div>
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-theme-primary/20 border border-theme-primary rounded-lg min-w-[120px] text-center">
              <span className="text-sm text-theme-primary font-mono animate-pulse">
                {formatRecordingKeys(recordingKeys)}
              </span>
            </div>
            <button
              onClick={onCancelRecording}
              className="p-1.5 text-theme-secondary hover:text-red-400 transition-colors"
              title="取消"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onStartRecording}
            disabled={disabled}
            className="px-3 py-1.5 bg-theme-card border border-theme rounded-lg hover:border-theme-primary transition-colors disabled:cursor-not-allowed"
          >
            <span className="text-sm text-theme font-mono">{formatShortcut(shortcut)}</span>
          </button>
        )}
      </div>
    </div>
  );
}
