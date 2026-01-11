import { useState, useEffect, useCallback } from 'react';
import { destroyVault } from '../../utils/api';
import { useVaultStore } from '../../stores/vaultStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DestroyVaultDialog({ isOpen, onClose }: Props) {
  const { lock } = useVaultStore();
  const [step, setStep] = useState<'confirm' | 'password' | 'success'>('confirm');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [backupPath, setBackupPath] = useState('');

  const CONFIRM_PHRASE = '确认销毁';

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && step !== 'success') {
      handleClose();
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleClose = () => {
    setStep('confirm');
    setPassword('');
    setConfirmText('');
    setError('');
    setBackupPath('');
    onClose();
  };

  const handleFirstConfirm = () => {
    if (confirmText !== CONFIRM_PHRASE) {
      setError(`请输入"${CONFIRM_PHRASE}"以继续`);
      return;
    }
    setError('');
    setStep('password');
  };

  const handleDestroy = async () => {
    if (!password) {
      setError('请输入主密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const path = await destroyVault(password);
      setBackupPath(path);
      setStep('success');
    } catch (err) {
      setError((err as Error).message || '销毁失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    lock();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && step !== 'success' && handleClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-md w-full border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-400">销毁密码库</h2>
          </div>
          {step !== 'success' && (
            <button 
              onClick={handleClose} 
              className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors"
              title="关闭 (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 内容 */}
        <div className="p-5">
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  危险操作
                </p>
                <p className="text-theme-secondary text-sm">
                  此操作将永久删除所有密码数据，包括：
                </p>
                <ul className="text-theme-secondary text-sm mt-2 list-disc list-inside space-y-1">
                  <li>所有保存的密码条目</li>
                  <li>所有自定义分类和标签</li>
                  <li>TOTP 二次验证设置</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-400 text-sm">
                  系统会在销毁前自动创建一份备份文件，以便您在需要时恢复数据。
                </p>
              </div>

              <div>
                <label className="block text-sm text-theme-secondary mb-2">
                  请输入 <span className="text-red-400 font-bold">"{CONFIRM_PHRASE}"</span> 以继续
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
                  placeholder={CONFIRM_PHRASE}
                  autoFocus
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-4">
              <p className="text-theme-secondary text-sm">
                请输入主密码以确认您的身份：
              </p>

              <div>
                <label className="block text-sm text-theme-secondary mb-2">
                  主密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
                  placeholder="输入主密码"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDestroy();
                  }}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-theme font-medium">密码库已销毁</p>
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm font-medium mb-1">备份文件已保存</p>
                <p className="text-theme-secondary text-xs break-all">{backupPath}</p>
              </div>

              <p className="text-theme-secondary text-sm text-center">
                您可以使用此备份文件恢复数据
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-theme flex gap-3 justify-end">
          {step === 'confirm' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
              >
                取消
              </button>
              <button
                onClick={handleFirstConfirm}
                disabled={confirmText !== CONFIRM_PHRASE}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                下一步
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <button
                onClick={() => setStep('confirm')}
                className="px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
              >
                返回
              </button>
              <button
                onClick={handleDestroy}
                disabled={isLoading || !password}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    销毁中...
                  </>
                ) : (
                  '确认销毁'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
