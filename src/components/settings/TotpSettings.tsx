import { useState, useEffect, useCallback } from 'react';
import { 
  setupTotp, 
  enableTotp, 
  disableTotp, 
  verifyTotp, 
  isTotpEnabled 
} from '../../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'status' | 'setup' | 'verify' | 'recovery';

export default function TotpSettings({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>('status');
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && step === 'status') {
      onClose();
    }
  }, [onClose, step]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const status = await isTotpEnabled();
      setEnabled(status);
    } catch (err) {
      console.error('Failed to check TOTP status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setStep('status');
      setError('');
      setVerifyCode('');
    }
  }, [isOpen]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const data = await setupTotp();
      setSecret(data.secret);
      setQrCode(data.qrCodeBase64);
      setRecoveryCodes(data.recoveryCodes);
      setStep('setup');
    } catch (err) {
      setError((err as Error).message || '设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const valid = await verifyTotp(verifyCode);
      if (!valid) {
        setError('验证码错误，请重试');
        setIsLoading(false);
        return;
      }
      
      await enableTotp(secret, recoveryCodes);
      setEnabled(true);
      setStep('recovery');
    } catch (err) {
      setError((err as Error).message || '启用失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('确定要禁用二次验证吗？这会降低账户安全性。')) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await disableTotp();
      setEnabled(false);
      setStep('status');
    } catch (err) {
      setError((err as Error).message || '禁用失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      alert('恢复码已复制到剪贴板');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && step === 'status' && onClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-md w-full border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">二次验证 (TOTP)</h2>
          </div>
          {step === 'status' && (
            <button 
              onClick={onClose} 
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
          {step === 'status' && (
            <div className="text-center space-y-5">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                enabled ? 'bg-green-500/20' : 'bg-theme-bg'
              }`}>
                {enabled ? (
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-theme">
                  {enabled ? '二次验证已启用' : '二次验证未启用'}
                </h3>
                <p className="text-sm text-theme-secondary mt-1">
                  {enabled 
                    ? '您的账户受到额外保护' 
                    : '启用二次验证可以增强账户安全性'}
                </p>
              </div>

              {enabled ? (
                <button
                  onClick={handleDisable}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoading ? '处理中...' : '禁用二次验证'}
                </button>
              ) : (
                <button
                  onClick={handleStartSetup}
                  disabled={isLoading}
                  className="px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoading ? '加载中...' : '启用二次验证'}
                </button>
              )}
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-theme-secondary mb-4">
                  使用身份验证器应用（如 Google Authenticator）扫描二维码
                </p>
                {qrCode && (
                  <img 
                    src={qrCode} 
                    alt="TOTP QR Code" 
                    className="mx-auto rounded-lg border border-theme"
                  />
                )}
              </div>

              <div className="p-3 bg-theme-bg rounded-lg border border-theme">
                <p className="text-xs text-theme-secondary mb-1">或手动输入密钥：</p>
                <p className="font-mono text-sm text-theme break-all select-all">{secret}</p>
              </div>

              <div>
                <label className="block text-sm text-theme-secondary mb-2">
                  输入验证码确认
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-theme-bg border border-theme rounded-lg text-center text-2xl font-mono tracking-widest text-theme focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('status')}
                  className="flex-1 px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
                >
                  取消
                </button>
                <button
                  onClick={handleVerifyAndEnable}
                  disabled={isLoading || verifyCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoading ? '验证中...' : '验证并启用'}
                </button>
              </div>
            </div>
          )}

          {step === 'recovery' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-theme">二次验证已启用</h3>
                <p className="text-sm text-theme-secondary mt-1">
                  请保存以下恢复码，用于在无法使用验证器时恢复访问
                </p>
              </div>

              <div className="p-4 bg-theme-bg rounded-lg border border-theme">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, i) => (
                    <div key={i} className="font-mono text-sm text-theme text-center py-1.5 bg-theme-card rounded select-all">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-400 text-sm">每个恢复码只能使用一次，请妥善保管</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
                >
                  复制恢复码
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {step === 'status' && (
          <div className="px-5 py-3 border-t border-theme">
            <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
          </div>
        )}
      </div>
    </div>
  );
}
