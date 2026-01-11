import { useState, useEffect, useRef, useCallback } from 'react';
import { createShareQR, destroyShare, getShareRemainingTime } from '../../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  entryTitle: string;
}

const TTL_OPTIONS = [
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
  { value: 1800, label: '30 分钟' },
];

export default function ShareDialog({ isOpen, onClose, entryId, entryTitle }: Props) {
  const [step, setStep] = useState<'config' | 'sharing'>('config');
  const [ttl, setTtl] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [sessionId, setSessionId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setError('');
      setSessionId('');
      setQrCode('');
    } else {
      if (sessionId) {
        destroyShare(sessionId).catch(console.error);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isOpen]);

  const handleCreateShare = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await createShareQR(entryId, ttl);
      setSessionId(result.sessionId);
      setQrCode(result.qrCodeBase64);
      
      const expiresAtMs = typeof result.expiresAt === 'string' 
        ? new Date(result.expiresAt).getTime() 
        : result.expiresAt;
      
      setExpiresAt(expiresAtMs);
      setRemainingTime(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)));
      setStep('sharing');
      
      timerRef.current = setInterval(async () => {
        try {
          const remaining = await getShareRemainingTime(result.sessionId);
          setRemainingTime(remaining);
          
          if (remaining <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setStep('config');
            setSessionId('');
            setQrCode('');
            setExpiresAt(0);
            setRemainingTime(0);
          }
        } catch {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setStep('config');
          setSessionId('');
          setQrCode('');
          setExpiresAt(0);
          setRemainingTime(0);
        }
      }, 1000);
    } catch (err) {
      setError((err as Error).message || '创建分享失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestroyShare = async () => {
    if (!sessionId) return;
    
    try {
      await destroyShare(sessionId);
    } catch (err) {
      console.error('Failed to destroy share:', err);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setStep('config');
    setSessionId('');
    setQrCode('');
    setExpiresAt(0);
    setRemainingTime(0);
    setError('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!expiresAt || ttl <= 0 || remainingTime <= 0) return 0;
    return Math.max(0, Math.min(100, (remainingTime / ttl) * 100));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-sm w-full border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">分享密码</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5">
          {step === 'config' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-theme-bg rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <p className="text-theme font-medium">{entryTitle}</p>
                <p className="text-sm text-theme-secondary mt-1">
                  生成临时二维码分享此密码
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                  有效期
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TTL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTtl(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        ttl === option.value
                          ? 'bg-theme-primary/10 border border-theme-primary/30 text-theme-primary'
                          : 'bg-theme-bg border border-transparent text-theme hover:border-theme'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-400 text-xs">
                  二维码将在有效期后自动失效，请确保在安全环境下分享
                </p>
              </div>

              <button
                onClick={handleCreateShare}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  '生成二维码'
                )}
              </button>
            </div>
          )}

          {step === 'sharing' && (
            <div className="space-y-5">
              {/* 二维码 */}
              <div className="text-center">
                {qrCode && (
                  <img 
                    src={qrCode} 
                    alt="Share QR Code" 
                    className="mx-auto rounded-lg border border-theme"
                  />
                )}
              </div>

              {/* 倒计时 */}
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-theme-border"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={226.19}
                      strokeDashoffset={226.19 * (1 - getProgress() / 100)}
                      className={`transition-all duration-1000 ${
                        remainingTime <= 30 ? 'text-red-500' : 'text-theme-primary'
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-mono font-bold ${
                      remainingTime <= 30 ? 'text-red-400' : 'text-theme'
                    }`}>
                      {formatTime(remainingTime)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-theme-secondary mt-2">
                  {remainingTime <= 30 ? '即将过期' : '剩余时间'}
                </p>
              </div>

              <button
                onClick={handleDestroyShare}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                立即销毁
              </button>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-5 py-3 border-t border-theme">
          <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
