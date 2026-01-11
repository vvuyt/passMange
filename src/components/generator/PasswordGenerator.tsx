import { useState, useEffect, useCallback } from 'react';
import { generatePassword, calculateStrength, createEntry } from '../../utils/api';
import { useVaultStore } from '../../stores/vaultStore';
import type { PasswordConfig, PasswordEntry } from '../../types/electron';

interface Props {
  onClose?: () => void;
  onPasswordSelect?: (password: string) => void;
  embedded?: boolean;
}

const STRENGTH_LEVELS = [
  { min: 0, max: 20, label: '非常弱', color: 'bg-red-500', textColor: 'text-red-400' },
  { min: 20, max: 40, label: '弱', color: 'bg-orange-500', textColor: 'text-orange-400' },
  { min: 40, max: 60, label: '中等', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { min: 60, max: 80, label: '强', color: 'bg-green-500', textColor: 'text-green-400' },
  { min: 80, max: 101, label: '非常强', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
];

export default function PasswordGenerator({ onClose, onPasswordSelect, embedded = false }: Props) {
  const { addEntry, categories } = useVaultStore();
  
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [config, setConfig] = useState<PasswordConfig>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    excludeAmbiguous: true,
  });
  
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveUsername, setSaveUsername] = useState('');
  const [saveCategoryId, setSaveCategoryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onClose && !showSaveForm) {
      onClose();
    }
  }, [onClose, showSaveForm]);

  useEffect(() => {
    if (!embedded) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [embedded, handleKeyDown]);

  const handleGenerate = useCallback(async () => {
    if (!config.uppercase && !config.lowercase && !config.numbers && !config.special) {
      return;
    }
    setIsGenerating(true);
    try {
      const newPassword = await generatePassword(config);
      setPassword(newPassword);
      setCopied(false);
    } catch (err) {
      console.error('生成密码失败:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [config]);

  useEffect(() => {
    if (password) {
      calculateStrength(password).then((result) => {
        if (typeof result === 'object' && result !== null && 'score' in result) {
          setStrength((result as { score: number }).score);
        } else {
          setStrength(result as number);
        }
      }).catch(() => setStrength(0));
    } else {
      setStrength(0);
    }
  }, [password]);

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleUse = () => {
    if (onPasswordSelect && password) {
      onPasswordSelect(password);
    }
  };

  const handleSave = async () => {
    if (!saveTitle.trim()) {
      setSaveError('请输入标题');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      const id = await createEntry({
        title: saveTitle.trim(),
        username: saveUsername.trim(),
        password,
        categoryId: saveCategoryId || undefined,
        tags: [],
        favorite: false,
      });
      const newEntry: PasswordEntry = {
        id,
        title: saveTitle.trim(),
        username: saveUsername.trim(),
        password,
        categoryId: saveCategoryId || undefined,
        tags: [],
        favorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addEntry(newEntry);
      setShowSaveForm(false);
      setSaveTitle('');
      setSaveUsername('');
      setSaveCategoryId('');
      handleGenerate();
    } catch (err) {
      setSaveError((err as Error).message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const getStrengthLevel = () => {
    return STRENGTH_LEVELS.find(l => strength >= l.min && strength < l.max) || STRENGTH_LEVELS[0];
  };

  const strengthLevel = getStrengthLevel();

  const updateConfig = (key: keyof PasswordConfig, value: boolean | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (password) {
      handleGenerate();
    }
  }, [config.length, config.uppercase, config.lowercase, config.numbers, config.special, config.excludeAmbiguous]);

  // 内嵌模式的内容
  const renderContent = () => (
    <div className="space-y-4">
      {/* 生成的密码 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-20 bg-theme-bg border border-theme rounded-lg font-mono text-sm tracking-wider text-theme focus:outline-none focus:ring-2 focus:ring-theme-primary"
              placeholder="点击生成"
              readOnly={isGenerating}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="p-1.5 text-theme-secondary hover:text-theme hover:bg-theme-card rounded transition-colors"
                title="重新生成"
              >
                <svg className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded transition-colors ${
                  copied ? 'text-green-400 bg-green-500/10' : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                }`}
                title={copied ? '已复制' : '复制'}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 强度指示器 */}
        <div className="space-y-1">
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  strength >= (i + 1) * 20 ? strengthLevel.color : 'bg-theme-border'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs">
            <span className={strengthLevel.textColor}>{strengthLevel.label}</span>
            <span className="text-theme-secondary">{strength}%</span>
          </div>
        </div>
      </div>

      {/* 长度滑块 */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-theme-secondary">长度</label>
          <span className="text-xs font-mono text-theme bg-theme-bg px-1.5 py-0.5 rounded">{config.length}</span>
        </div>
        <input
          type="range"
          min="8"
          max="64"
          value={config.length}
          onChange={(e) => updateConfig('length', parseInt(e.target.value))}
          className="w-full h-1.5 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
        />
      </div>

      {/* 字符类型选项 */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { key: 'uppercase', label: '大写', desc: 'A-Z' },
          { key: 'lowercase', label: '小写', desc: 'a-z' },
          { key: 'numbers', label: '数字', desc: '0-9' },
          { key: 'special', label: '符号', desc: '!@#$' },
        ].map(({ key, label, desc }) => (
          <label
            key={key}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-xs ${
              config[key as keyof PasswordConfig] 
                ? 'bg-theme-primary/10 border border-theme-primary/30' 
                : 'bg-theme-bg border border-transparent hover:border-theme'
            }`}
          >
            <input
              type="checkbox"
              checked={config[key as keyof PasswordConfig] as boolean}
              onChange={(e) => updateConfig(key as keyof PasswordConfig, e.target.checked)}
              className="sr-only"
            />
            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
              config[key as keyof PasswordConfig] 
                ? 'bg-theme-primary border-theme-primary' 
                : 'border-theme-secondary'
            }`}>
              {config[key as keyof PasswordConfig] && (
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-theme">{label}</span>
            <span className="text-theme-secondary ml-auto">{desc}</span>
          </label>
        ))}
      </div>

      {/* 使用按钮 */}
      {onPasswordSelect && (
        <button
          onClick={handleUse}
          disabled={!password}
          className="w-full px-3 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          使用此密码
        </button>
      )}
    </div>
  );

  if (embedded) {
    return <div className="p-3">{renderContent()}</div>;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-theme-card rounded-xl w-full max-w-md shadow-2xl border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">密码生成器</h2>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
              title="关闭 (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-5">
          {/* 生成的密码 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-24 bg-theme-bg border border-theme rounded-lg font-mono text-lg tracking-wider text-theme focus:outline-none focus:ring-2 focus:ring-theme-primary"
                  placeholder="点击生成"
                  readOnly={isGenerating}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
                    title="重新生成"
                  >
                    <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`p-2 rounded-lg transition-colors ${
                      copied ? 'text-green-400 bg-green-500/10' : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                    }`}
                    title={copied ? '已复制' : '复制'}
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 强度指示器 */}
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      strength >= (i + 1) * 20 ? strengthLevel.color : 'bg-theme-border'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs">
                <span className={strengthLevel.textColor}>{strengthLevel.label}</span>
                <span className="text-theme-secondary">{strength}%</span>
              </div>
            </div>
          </div>

          {/* 长度滑块 */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-theme-secondary">密码长度</label>
              <span className="text-sm font-mono text-theme bg-theme-bg px-2 py-0.5 rounded">{config.length}</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={config.length}
              onChange={(e) => updateConfig('length', parseInt(e.target.value))}
              className="w-full h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
            />
            <div className="flex justify-between text-xs text-theme-secondary mt-1">
              <span>8</span>
              <span>64</span>
            </div>
          </div>

          {/* 字符类型选项 */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'uppercase', label: '大写字母', desc: 'A-Z' },
              { key: 'lowercase', label: '小写字母', desc: 'a-z' },
              { key: 'numbers', label: '数字', desc: '0-9' },
              { key: 'special', label: '特殊字符', desc: '!@#$' },
            ].map(({ key, label, desc }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  config[key as keyof PasswordConfig] 
                    ? 'bg-theme-primary/10 border border-theme-primary/30' 
                    : 'bg-theme-bg border border-transparent hover:border-theme'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config[key as keyof PasswordConfig] as boolean}
                  onChange={(e) => updateConfig(key as keyof PasswordConfig, e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  config[key as keyof PasswordConfig] 
                    ? 'bg-theme-primary border-theme-primary' 
                    : 'border-theme-secondary'
                }`}>
                  {config[key as keyof PasswordConfig] && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="text-sm text-theme block">{label}</span>
                  <span className="text-xs text-theme-secondary">{desc}</span>
                </div>
              </label>
            ))}
          </div>

          {/* 排除易混淆字符 */}
          <label className="flex items-center gap-3 p-3 bg-theme-bg rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeAmbiguous}
              onChange={(e) => updateConfig('excludeAmbiguous', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              config.excludeAmbiguous 
                ? 'bg-theme-primary border-theme-primary' 
                : 'border-theme-secondary'
            }`}>
              {config.excludeAmbiguous && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <span className="text-sm text-theme">排除易混淆字符</span>
              <span className="text-xs text-theme-secondary ml-2">0O1lI</span>
            </div>
          </label>
        </div>

        {/* 底部操作 */}
        <div className="px-5 py-4 border-t border-theme flex items-center justify-between">
          <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
          <div className="flex gap-2">
            {onPasswordSelect && (
              <button
                onClick={handleUse}
                disabled={!password}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                使用
              </button>
            )}
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              disabled={!password}
              className="px-4 py-2 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
            >
              保存
            </button>
          </div>
        </div>

        {/* 快速保存表单 */}
        {showSaveForm && (
          <div className="px-5 pb-5 border-t border-theme pt-4">
            <h3 className="text-sm font-medium text-theme mb-3">快速保存为新密码</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="标题 *"
                className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
                autoFocus
              />
              <input
                type="text"
                value={saveUsername}
                onChange={(e) => setSaveUsername(e.target.value)}
                placeholder="用户名（可选）"
                className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
              <select
                value={saveCategoryId}
                onChange={(e) => setSaveCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="">未分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              
              {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
              
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="px-3 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm rounded-lg border border-theme transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
