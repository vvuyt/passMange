import { useState, useEffect } from 'react';
import { getSecurityInfo, upgradeSecurityParams, type SecurityInfo } from '../../utils/api';

interface Props {
  onUpgradeComplete?: () => void;
}

export default function SecurityInfoSection({ onUpgradeComplete }: Props) {
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    try {
      const info = await getSecurityInfo();
      setSecurityInfo(info);
    } catch (err) {
      console.error('加载安全信息失败:', err);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradePassword) {
      setError('请输入主密码');
      return;
    }

    setError(null);
    setUpgrading(true);

    try {
      await upgradeSecurityParams(upgradePassword);
      setSuccess('安全参数升级成功！');
      setShowUpgradeDialog(false);
      setUpgradePassword('');
      await loadSecurityInfo();
      onUpgradeComplete?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpgrading(false);
    }
  };

  const getSecurityLevelInfo = (level: string) => {
    switch (level) {
      case 'high':
        return { label: '高', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' };
      case 'medium':
        return { label: '中', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' };
      default:
        return { label: '低', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' };
    }
  };

  if (!securityInfo) return null;

  const levelInfo = getSecurityLevelInfo(securityInfo.securityLevel);

  return (
    <>
      <div className="space-y-3">
        {/* 安全等级显示 */}
        <div className={`p-3 rounded-lg ${levelInfo.bgColor} border ${levelInfo.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className={`w-4 h-4 ${levelInfo.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <span className="text-sm text-theme">加密安全等级</span>
                <span className={`ml-2 text-sm font-medium ${levelInfo.color}`}>{levelInfo.label}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-theme-secondary space-y-1">
            <div className="flex justify-between">
              <span>PBKDF2 迭代次数</span>
              <span className="text-theme">{securityInfo.iterations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>密钥派生耗时</span>
              <span className="text-theme">{securityInfo.derivationTimeMs}ms</span>
            </div>
          </div>
        </div>

        {/* 升级提示 */}
        {securityInfo.needsUpgrade && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-amber-400 font-medium">建议升级安全参数</p>
                <p className="text-xs text-amber-400/70 mt-1">
                  当前迭代次数低于推荐值（600,000），建议升级以提高安全性。
                </p>
                <button
                  onClick={() => setShowUpgradeDialog(true)}
                  className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  立即升级
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}
      </div>

      {/* 升级对话框 */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-theme-card rounded-xl shadow-2xl max-w-sm w-full border border-theme animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-theme">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-theme">升级安全参数</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-theme-secondary">
                升级将增加 PBKDF2 迭代次数到 600,000，这会使暴力破解更加困难。
                升级过程需要重新加密所有数据，请输入主密码确认：
              </p>
              <input
                type="password"
                value={upgradePassword}
                onChange={(e) => setUpgradePassword(e.target.value)}
                placeholder="主密码"
                className="w-full px-3 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
                onKeyDown={(e) => e.key === 'Enter' && handleUpgrade()}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <p className="text-xs text-theme-secondary">
                ⚠️ 升级过程可能需要几秒钟，请勿关闭应用
              </p>
            </div>
            <div className="px-5 py-4 border-t border-theme flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeDialog(false);
                  setUpgradePassword('');
                  setError(null);
                }}
                disabled={upgrading}
                className="flex-1 px-4 py-2 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
              >
                取消
              </button>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    升级中...
                  </>
                ) : (
                  '确认升级'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
