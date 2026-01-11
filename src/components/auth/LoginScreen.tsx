import { useState, useEffect } from 'react';
import { unlockVault, resetVault } from '../../utils/api';

interface Props {
  onUnlock: () => void;
  onReset?: () => void;
}

export default function LoginScreen({ onUnlock, onReset }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  // 错误时抖动效果
  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('请输入主密码');
      return;
    }

    setIsLoading(true);
    try {
      await unlockVault(password);
      onUnlock();
    } catch (err) {
      setError((err as Error).message || '密码错误');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (resetStep < 2) {
      setResetStep(resetStep + 1);
      return;
    }
    
    setIsResetting(true);
    try {
      await resetVault();
      setShowResetConfirm(false);
      setResetStep(0);
      onReset?.();
    } catch (err) {
      setError((err as Error).message || '重置失败');
    } finally {
      setIsResetting(false);
    }
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
    setResetStep(0);
  };

  return (
    <div className="h-full bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative bg-theme-card/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-sm border border-theme shadow-2xl animate-fade-in-up ${shake ? 'animate-shake' : ''}`}>
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-theme">密码管理器</h1>
          <p className="text-theme-secondary mt-2 text-sm">输入主密码以解锁您的密码库</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 密码输入框 */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-theme-bg border border-theme rounded-xl text-theme placeholder:text-theme-secondary/60 transition-all focus:border-theme-primary"
              placeholder="输入主密码"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-secondary hover:text-theme transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* 解锁按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>解锁中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span>解锁</span>
              </>
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <p className="text-center text-theme-secondary/60 text-xs mt-6">
          您的数据使用 AES-256 加密保护
        </p>

        {/* 重置按钮 */}
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full mt-4 text-theme-secondary/60 hover:text-red-400 text-xs transition-colors"
        >
          忘记密码？重置密码库
        </button>
      </div>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-theme-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-theme shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-theme mb-2">
                {resetStep === 0 && '确定要重置密码库吗？'}
                {resetStep === 1 && '这将删除所有数据！'}
                {resetStep === 2 && '最后确认'}
              </h3>
              <p className="text-theme-secondary text-sm">
                {resetStep === 0 && '重置后所有密码数据将被永久删除，无法恢复。'}
                {resetStep === 1 && '包括所有密码、分类、标签等数据都将被清除。'}
                {resetStep === 2 && '点击确认后将立即清除所有数据，此操作不可撤销！'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelReset}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 bg-theme-bg border border-theme rounded-xl text-theme hover:bg-theme-hover transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    重置中...
                  </>
                ) : (
                  resetStep < 2 ? `确认 (${resetStep + 1}/3)` : '确认重置'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
