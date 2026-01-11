import { useState, useEffect, useCallback } from 'react';
import {
  syncBindQuark,
  syncUnbindQuark,
  syncGetAuthState,
  syncUpload,
  syncDownload,
  syncConfirmRestore,
  syncGetInfo,
  syncExportFile,
  syncImportFile,
  syncGetConfig,
  syncSetConfig,
  type SyncAuthState,
  type SyncInfo,
  type SyncConfig,
} from '../../utils/api';
import ManualCookieDialog from './ManualCookieDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SyncStatus = 'idle' | 'uploading' | 'downloading' | 'restoring';

export default function SyncSettings({ isOpen, onClose }: Props) {
  const [authState, setAuthState] = useState<SyncAuthState>({ isAuthenticated: false });
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showManualCookieDialog, setShowManualCookieDialog] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showRestoreDialog && !showManualCookieDialog) {
      onClose();
    }
  }, [onClose, showRestoreDialog, showManualCookieDialog]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const loadData = useCallback(async () => {
    try {
      const [auth, info, cfg] = await Promise.all([
        syncGetAuthState(),
        syncGetInfo(),
        syncGetConfig(),
      ]);
      setAuthState(auth);
      setSyncInfo(info);
      setConfig(cfg);
    } catch (err) {
      console.error('加载同步状态失败:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleBind = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await syncBindQuark();
      if (result.success) {
        setSuccess(`已绑定夸克云盘账号: ${result.nickname}`);
        await loadData();
      } else {
        // 自动登录失败时提示可以尝试手动设置
        setError(`${result.error || '绑定失败'}。如果自动登录失败，可以尝试手动设置Cookie。`);
      }
    } catch (err) {
      setError(`${(err as Error).message}。如果自动登录失败，可以尝试手动设置Cookie。`);
    }
  };

  const handleManualCookieSuccess = async (nickname: string) => {
    setSuccess(`已绑定夸克云盘账号: ${nickname}`);
    await loadData();
  };

  const handleUnbind = async () => {
    if (!confirm('确定要解绑夸克云盘吗？')) return;
    setError(null);
    try {
      await syncUnbindQuark();
      setSuccess('已解绑夸克云盘');
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpload = async () => {
    setError(null);
    setSuccess(null);
    setStatus('uploading');
    try {
      const result = await syncUpload();
      if (result.success) {
        setSuccess('上传成功');
        await loadData();
      } else {
        setError(result.error || '上传失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus('idle');
    }
  };

  const handleDownload = async () => {
    setError(null);
    setSuccess(null);
    setStatus('downloading');
    try {
      const result = await syncDownload();
      if (result.success) {
        if (result.needsRestore) {
          setShowRestoreDialog(true);
        } else {
          setSuccess('下载成功，数据已是最新');
        }
        await loadData();
      } else {
        setError(result.error || '下载失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus('idle');
    }
  };

  const handleConfirmRestore = async () => {
    if (!restorePassword) {
      setError('请输入主密码');
      return;
    }
    setError(null);
    setStatus('restoring');
    try {
      const result = await syncConfirmRestore(restorePassword);
      if (result.success) {
        setSuccess('数据恢复成功，请重新登录');
        setShowRestoreDialog(false);
        setRestorePassword('');
        window.location.reload();
      } else {
        setError(result.error || '恢复失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus('idle');
    }
  };

  const handleExportFile = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await syncExportFile();
      if (result.success) {
        setSuccess(`已导出到: ${result.filePath}`);
      } else if (result.error !== '用户取消') {
        setError(result.error || '导出失败');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImportFile = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await syncImportFile();
      if (result.success) {
        if (result.needsRestore) {
          setShowRestoreDialog(true);
        } else {
          setSuccess('导入成功');
        }
      } else if (result.error !== '用户取消') {
        setError(result.error || '导入失败');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleConfigChange = async (key: keyof SyncConfig, value: boolean) => {
    if (!config) return;
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    try {
      await syncSetConfig({ [key]: value });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '从未';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const getStatusText = (s?: string) => {
    switch (s) {
      case 'synced': return '已同步';
      case 'local_changed': return '本地有更改';
      case 'cloud_changed': return '云端有更新';
      case 'conflict': return '存在冲突';
      default: return '未连接';
    }
  };

  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'synced': return 'text-green-400';
      case 'local_changed': return 'text-yellow-400';
      case 'cloud_changed': return 'text-blue-400';
      case 'conflict': return 'text-red-400';
      default: return 'text-theme-secondary';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-md w-full border border-theme animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">云同步</h2>
          </div>
          <button onClick={onClose} className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors" title="关闭 (Esc)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">夸克云盘</h3>
            {authState.isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-theme-bg rounded-lg border border-theme">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-medium">
                      {authState.nickname?.charAt(0) || '夸'}
                    </div>
                    <div>
                      <div className="text-sm text-theme font-medium">已绑定</div>
                      <div className="text-xs text-theme-secondary">{authState.nickname}</div>
                    </div>
                  </div>
                  <button onClick={handleUnbind} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                    解绑
                  </button>
                </div>
                
                <div className="p-3 bg-theme-bg rounded-lg border border-theme space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">同步状态</span>
                    <span className={getStatusColor(syncInfo?.status)}>{getStatusText(syncInfo?.status)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">上次同步</span>
                    <span className="text-theme">{formatTime(syncInfo?.lastSyncTime)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleUpload} disabled={status !== 'idle'} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {status === 'uploading' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                    {status === 'uploading' ? '上传中...' : '上传'}
                  </button>
                  <button onClick={handleDownload} disabled={status !== 'idle'} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {status === 'downloading' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                    {status === 'downloading' ? '下载中...' : '下载'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button onClick={handleBind} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  绑定夸克云盘
                </button>
                <button 
                  onClick={() => setShowManualCookieDialog(true)} 
                  className="w-full px-4 py-2.5 bg-theme-bg hover:bg-theme-card text-theme-secondary hover:text-theme rounded-lg text-sm transition-colors border border-theme flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  手动设置Cookie（高级）
                </button>
              </div>
            )}
          </section>

          {authState.isAuthenticated && config && (
            <section>
              <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">同步设置</h3>
              <label className="flex items-center justify-between p-3 bg-theme-bg rounded-lg border border-theme cursor-pointer">
                <span className="text-sm text-theme">退出时提醒未同步更改</span>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${config.remindOnExit ? 'bg-theme-primary' : 'bg-theme-border'}`}>
                  <input type="checkbox" checked={config.remindOnExit} onChange={(e) => handleConfigChange('remindOnExit', e.target.checked)} className="sr-only" />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.remindOnExit ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">本地文件</h3>
            <p className="text-xs text-theme-secondary mb-3">当云盘不可用时，可以通过文件手动同步数据</p>
            <div className="flex gap-2">
              <button onClick={handleExportFile} className="flex-1 px-4 py-2.5 bg-theme-bg hover:bg-theme-card text-theme rounded-lg text-sm font-medium transition-colors border border-theme flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                导出文件
              </button>
              <button onClick={handleImportFile} className="flex-1 px-4 py-2.5 bg-theme-bg hover:bg-theme-card text-theme rounded-lg text-sm font-medium transition-colors border border-theme flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                导入文件
              </button>
            </div>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
            <button onClick={onClose} className="px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors">完成</button>
          </div>
        </div>
      </div>

      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-theme-card rounded-xl shadow-2xl max-w-sm w-full border border-theme animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-theme">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-theme">确认恢复数据</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-theme-secondary">云端数据将覆盖本地数据，请输入主密码确认：</p>
              <input type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} placeholder="主密码" className="w-full px-3 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20" onKeyDown={(e) => e.key === 'Enter' && handleConfirmRestore()} />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-theme flex gap-3">
              <button onClick={() => { setShowRestoreDialog(false); setRestorePassword(''); setError(null); }} disabled={status === 'restoring'} className="flex-1 px-4 py-2 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme">取消</button>
              <button onClick={handleConfirmRestore} disabled={status === 'restoring'} className="flex-1 px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{status === 'restoring' ? '恢复中...' : '确认恢复'}</button>
            </div>
          </div>
        </div>
      )}

      <ManualCookieDialog
        open={showManualCookieDialog}
        onClose={() => setShowManualCookieDialog(false)}
        onSuccess={handleManualCookieSuccess}
      />
    </div>
  );
}
