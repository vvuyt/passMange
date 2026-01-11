import { useState } from 'react';
import { setupVault, syncBindQuark, syncDownload, syncConfirmRestore, checkPasswordStrength, type PasswordStrengthResult } from '../../utils/api';

interface Props {
  onComplete: () => void;
}

type SetupMode = 'choose' | 'create' | 'restore';
type RestoreStep = 'bind' | 'download' | 'password';

// 锁图标组件
const LockIcon = () => (
  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// 返回按钮组件
const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1 text-theme-secondary hover:text-theme mb-6 text-sm transition-colors">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    返回
  </button>
);

// 错误提示组件
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-red-400 text-sm">{message}</span>
  </div>
);

export default function SetupWizard({ onComplete }: Props) {
  const [mode, setMode] = useState<SetupMode>('choose');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState(0);
  const [strengthResult, setStrengthResult] = useState<PasswordStrengthResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 云端恢复状态
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('bind');
  const [nickname, setNickname] = useState('');

  const handlePasswordChange = async (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      // 使用新的密码强度检查 API
      const result = await checkPasswordStrength(value);
      setStrengthResult(result);
      // 转换为百分比用于进度条
      setStrength(result.score * 25);
    } else {
      setStrength(0);
      setStrengthResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('主密码至少需要 8 个字符');
      return;
    }

    // 检查密码强度是否达到中等以上
    if (strengthResult && !strengthResult.isAcceptable) {
      setError('密码强度不足，请设置更强的密码');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await setupVault(password);
      onComplete();
    } catch (err) {
      setError((err as Error).message || '设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBindQuark = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await syncBindQuark();
      if (result.success) {
        setNickname(result.nickname || '');
        setRestoreStep('download');
      } else {
        setError(result.error || '绑定失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await syncDownload();
      if (result.success) {
        if (result.needsRestore) {
          setRestoreStep('password');
        } else {
          setError('云端没有找到备份数据');
        }
      } else {
        setError(result.error || '下载失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('请输入主密码');
      return;
    }

    setIsLoading(true);
    try {
      const result = await syncConfirmRestore(password);
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || '恢复失败，请检查主密码是否正确');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (!strengthResult) return 'bg-red-500';
    switch (strengthResult.level) {
      case 'very-strong': return 'bg-emerald-500';
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'weak': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthText = () => {
    if (!strengthResult) return '弱';
    switch (strengthResult.level) {
      case 'very-strong': return '很强';
      case 'strong': return '强';
      case 'medium': return '中等';
      case 'weak': return '弱';
      default: return '很弱';
    }
  };

  const getStrengthTextColor = () => {
    if (!strengthResult) return 'text-red-400';
    switch (strengthResult.level) {
      case 'very-strong': return 'text-emerald-400';
      case 'strong': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'weak': return 'text-orange-400';
      default: return 'text-red-400';
    }
  };

  // 密码输入框组件
  const PasswordInput = ({ 
    value, 
    onChange, 
    placeholder, 
    show, 
    onToggleShow,
    autoFocus = false 
  }: { 
    value: string; 
    onChange: (v: string) => void; 
    placeholder: string;
    show: boolean;
    onToggleShow: () => void;
    autoFocus?: boolean;
  }) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-12 py-3 bg-theme-bg border border-theme rounded-xl text-theme placeholder:text-theme-secondary/60 transition-all focus:border-theme-primary"
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-secondary hover:text-theme transition-colors"
      >
        {show ? (
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
  );

  // 选择模式界面
  if (mode === 'choose') {
    return (
      <div className="h-full bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative bg-theme-card/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-theme shadow-2xl">
          {/* Logo 和标题 */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LockIcon />
            </div>
            <h1 className="text-2xl font-bold text-theme">欢迎使用密码管理器</h1>
            <p className="text-theme-secondary mt-2 text-sm">安全存储和管理您的所有密码</p>
          </div>

          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setMode('create')}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/25 text-left group btn-press hover-lift"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">创建新密码库</div>
                  <div className="text-sm text-blue-200 mt-0.5">设置主密码，开始使用</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('restore')}
              className="w-full p-4 bg-theme-bg hover:bg-theme-sidebar text-theme rounded-xl transition-all border border-theme text-left group btn-press hover-lift"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-theme-sidebar rounded-lg flex items-center justify-center text-theme-secondary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">从云端恢复</div>
                  <div className="text-sm text-theme-secondary mt-0.5">从夸克云盘恢复已有数据</div>
                </div>
              </div>
            </button>
          </div>

          {/* 底部提示 */}
          <p className="text-center text-theme-secondary/60 text-xs mt-6">
            您的数据使用 AES-256 加密保护
          </p>
        </div>
      </div>
    );
  }

  // 云端恢复流程
  if (mode === 'restore') {
    return (
      <div className="h-full bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative bg-theme-card/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-theme shadow-2xl">
          <BackButton onClick={() => { setMode('choose'); setRestoreStep('bind'); setError(''); }} />

          {/* Logo 和标题 */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-theme">从云端恢复</h1>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['bind', 'download', 'password'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  restoreStep === step 
                    ? 'bg-blue-500 text-white' 
                    : ['bind', 'download', 'password'].indexOf(restoreStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-theme-sidebar text-theme-secondary'
                }`}>
                  {['bind', 'download', 'password'].indexOf(restoreStep) > index ? '✓' : index + 1}
                </div>
                {index < 2 && <div className={`w-8 h-0.5 ${['bind', 'download', 'password'].indexOf(restoreStep) > index ? 'bg-green-500' : 'bg-theme-sidebar'}`} />}
              </div>
            ))}
          </div>
          
          {restoreStep === 'bind' && (
            <div className="space-y-5">
              <p className="text-theme-secondary text-center">首先绑定您的夸克云盘账号</p>
              {error && <ErrorMessage message={error} />}
              <button
                onClick={handleBindQuark}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>正在打开登录窗口...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>绑定夸克云盘</span>
                  </>
                )}
              </button>
            </div>
          )}

          {restoreStep === 'download' && (
            <div className="space-y-5">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <span className="text-green-400 text-sm">已绑定账号: {nickname}</span>
              </div>
              <p className="text-theme-secondary text-center">点击下方按钮从云端下载数据</p>
              {error && <ErrorMessage message={error} />}
              <button
                onClick={handleDownloadFromCloud}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>下载中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>从云端下载</span>
                  </>
                )}
              </button>
            </div>
          )}

          {restoreStep === 'password' && (
            <form onSubmit={handleRestoreWithPassword} className="space-y-5">
              <p className="text-theme-secondary text-center">请输入您的主密码来恢复数据</p>
              
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="输入主密码"
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                autoFocus
              />

              {error && <ErrorMessage message={error} />}

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
                    <span>恢复中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>恢复数据</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 底部提示 */}
          <p className="text-center text-theme-secondary/60 text-xs mt-6">
            您的数据使用 AES-256 加密保护
          </p>
        </div>
      </div>
    );
  }

  // 创建新密码库
  return (
    <div className="h-full bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-theme-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-theme-card/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-theme shadow-2xl">
        <BackButton onClick={() => { setMode('choose'); setError(''); setPassword(''); setConfirmPassword(''); setStrength(0); }} />

        {/* Logo 和标题 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-theme">创建密码库</h1>
          <p className="text-theme-secondary mt-2 text-sm">设置主密码来保护您的数据</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">主密码</label>
            <PasswordInput
              value={password}
              onChange={handlePasswordChange}
              placeholder="输入主密码（至少8位）"
              show={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
              autoFocus
            />
            {password && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-theme-secondary">密码强度</span>
                  <span className={`font-medium ${getStrengthTextColor()}`}>{getStrengthText()}</span>
                </div>
                <div className="h-1.5 bg-theme-sidebar rounded-full overflow-hidden">
                  <div className={`h-full ${getStrengthColor()} transition-all duration-300`} style={{ width: `${strength}%` }} />
                </div>
                {strengthResult && strengthResult.feedback.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {strengthResult.feedback.map((tip, index) => (
                      <li key={index} className="text-xs text-theme-secondary flex items-center gap-1">
                        <svg className="w-3 h-3 text-theme-secondary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
                {strengthResult && !strengthResult.isAcceptable && (
                  <p className="text-xs text-red-400 mt-2">⚠️ 密码强度需达到"中等"以上才能创建密码库</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">确认密码</label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="再次输入主密码"
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
            />
            {confirmPassword && password && confirmPassword !== password && (
              <p className="text-orange-400 text-xs mt-2">两次输入的密码不一致</p>
            )}
            {confirmPassword && password && confirmPassword === password && (
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                密码匹配
              </p>
            )}
          </div>

          {error && <ErrorMessage message={error} />}

          <button
            type="submit"
            disabled={isLoading || !!(strengthResult && !strengthResult.isAcceptable)}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>创建中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>创建密码库</span>
              </>
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400/80 text-xs text-center flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            请牢记您的主密码，它无法被恢复
          </p>
        </div>
      </div>
    </div>
  );
}
