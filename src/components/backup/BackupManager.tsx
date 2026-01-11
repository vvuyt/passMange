import { useState, useEffect, useCallback } from 'react';
import { 
  createBackup, 
  restoreBackupWithMode, 
  listBackups, 
  verifyBackup,
  previewBackup,
  showOpenDialog,
  type BackupPreview
} from '../../utils/api';
import type { BackupInfo } from '../../types/electron';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 恢复确认对话框
function RestoreDialog({ 
  preview, 
  onConfirm, 
  onCancel,
  isRestoring 
}: { 
  preview: BackupPreview; 
  onConfirm: (mode: 'overwrite' | 'merge') => void; 
  onCancel: () => void;
  isRestoring: boolean;
}) {
  const [mode, setMode] = useState<'overwrite' | 'merge'>('overwrite');

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={(e) => e.target === e.currentTarget && !isRestoring && onCancel()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-lg w-full border border-theme animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-theme">确认恢复备份</h3>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 备份内容预览 */}
          <div className="bg-theme-bg rounded-lg p-4 border border-theme">
            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">备份内容</h4>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="p-3 bg-theme-card rounded-lg">
                <div className="text-2xl font-bold text-theme-primary">{preview.entriesCount}</div>
                <div className="text-xs text-theme-secondary">密码条目</div>
              </div>
              <div className="p-3 bg-theme-card rounded-lg">
                <div className="text-2xl font-bold text-theme-primary">{preview.categoriesCount}</div>
                <div className="text-xs text-theme-secondary">分类</div>
              </div>
              <div className="p-3 bg-theme-card rounded-lg">
                <div className="text-2xl font-bold text-theme-primary">{preview.tagsCount}</div>
                <div className="text-xs text-theme-secondary">标签</div>
              </div>
            </div>
            
            {preview.entries.length > 0 && (
              <div>
                <h5 className="text-xs text-theme-secondary mb-2">
                  密码条目预览 (前 {Math.min(preview.entries.length, 10)} 条)
                </h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {preview.entries.slice(0, 10).map((entry, i) => (
                    <div key={i} className="text-xs text-theme flex items-center gap-2 py-1.5 px-2 bg-theme-card rounded">
                      <span className="font-medium truncate flex-1">{entry.title}</span>
                      <span className="text-theme-secondary truncate">{entry.username}</span>
                    </div>
                  ))}
                  {preview.entries.length > 10 && (
                    <div className="text-xs text-theme-secondary text-center py-1">
                      ... 还有 {preview.entries.length - 10} 条
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 恢复模式选择 */}
          <div>
            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">恢复模式</h4>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                mode === 'overwrite' 
                  ? 'bg-theme-primary/10 border border-theme-primary/30' 
                  : 'bg-theme-bg border border-transparent hover:border-theme'
              }`}>
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  mode === 'overwrite' ? 'border-theme-primary' : 'border-theme-secondary'
                }`}>
                  {mode === 'overwrite' && <div className="w-2 h-2 rounded-full bg-theme-primary" />}
                </div>
                <input
                  type="radio"
                  name="restoreMode"
                  value="overwrite"
                  checked={mode === 'overwrite'}
                  onChange={() => setMode('overwrite')}
                  className="sr-only"
                />
                <div>
                  <div className="font-medium text-theme text-sm">覆盖恢复</div>
                  <div className="text-xs text-theme-secondary">
                    删除当前所有数据，完全恢复为备份内容
                  </div>
                </div>
              </label>
              
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                mode === 'merge' 
                  ? 'bg-theme-primary/10 border border-theme-primary/30' 
                  : 'bg-theme-bg border border-transparent hover:border-theme'
              }`}>
                <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  mode === 'merge' ? 'border-theme-primary' : 'border-theme-secondary'
                }`}>
                  {mode === 'merge' && <div className="w-2 h-2 rounded-full bg-theme-primary" />}
                </div>
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="sr-only"
                />
                <div>
                  <div className="font-medium text-theme text-sm">增量合并</div>
                  <div className="text-xs text-theme-secondary">
                    保留当前数据，仅添加备份中不存在的条目
                  </div>
                </div>
              </label>
            </div>
          </div>

          {mode === 'overwrite' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-400">覆盖恢复将删除当前所有数据，此操作不可撤销！</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-theme flex gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isRestoring}
            className="flex-1 px-4 py-2 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(mode)}
            disabled={isRestoring}
            className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              mode === 'overwrite' ? 'bg-red-500 hover:bg-red-600' : 'bg-theme-primary hover:opacity-90'
            }`}
          >
            {isRestoring ? '恢复中...' : mode === 'overwrite' ? '确认覆盖' : '确认合并'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BackupManager({ isOpen, onClose }: Props) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [restoreDialog, setRestoreDialog] = useState<{
    show: boolean;
    filePath: string;
    preview: BackupPreview | null;
  }>({ show: false, filePath: '', preview: null });

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !restoreDialog.show) {
      onClose();
    }
  }, [onClose, restoreDialog.show]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setError('');
    setSuccess('');
    
    try {
      const backup = await createBackup('manual');
      setBackups([backup, ...backups]);
      setSuccess('备份创建成功');
    } catch (err) {
      setError((err as Error).message || '创建备份失败');
    } finally {
      setIsCreating(false);
    }
  };

  const prepareRestore = async (filePath: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const verification = await verifyBackup(filePath);
      if (!verification.valid) {
        setError(verification.error || '备份文件无效或已损坏');
        return;
      }
      
      const preview = await previewBackup(filePath);
      setRestoreDialog({ show: true, filePath, preview });
    } catch (err) {
      setError((err as Error).message || '读取备份失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreFromList = async (backup: BackupInfo) => {
    await prepareRestore(backup.path);
  };

  const handleRestoreFromFile = async () => {
    try {
      const result = await showOpenDialog({
        title: '选择备份文件',
        filters: [
          { name: '备份文件', extensions: ['pwbak'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });
      
      if (result.canceled || result.filePaths.length === 0) return;
      
      await prepareRestore(result.filePaths[0]);
    } catch (err) {
      setError((err as Error).message || '选择文件失败');
    }
  };

  const handleConfirmRestore = async (mode: 'overwrite' | 'merge') => {
    if (!restoreDialog.filePath) return;
    
    setIsRestoring(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await restoreBackupWithMode(restoreDialog.filePath, mode);
      
      if (mode === 'merge') {
        setSuccess(`增量恢复完成：新增 ${result.added} 条，跳过 ${result.skipped} 条重复`);
      } else {
        setSuccess('备份恢复成功，请重新登录');
      }
      
      setRestoreDialog({ show: false, filePath: '', preview: null });
      loadBackups();
    } catch (err) {
      setError((err as Error).message || '恢复备份失败');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatSize = (bytes: number | undefined) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '未知';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-2xl w-full border border-theme animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">备份管理</h2>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleCreateBackup}
              disabled={isCreating || isRestoring}
              className="flex-1 px-4 py-2.5 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              {isCreating ? '创建中...' : '创建备份'}
            </button>
            <button
              onClick={handleRestoreFromFile}
              disabled={isCreating || isRestoring || isLoading}
              className="flex-1 px-4 py-2.5 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              从文件恢复
            </button>
          </div>

          {/* 提示信息 */}
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

          {/* 备份列表 */}
          <div>
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">备份历史</h3>
            
            {isLoading && !restoreDialog.show ? (
              <div className="text-center py-8 text-theme-secondary">
                <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                加载中...
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto bg-theme-bg rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-theme-secondary text-sm">暂无备份</p>
                <p className="text-theme-secondary text-xs mt-1">点击"创建备份"开始</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup, index) => (
                  <div
                    key={index}
                    className="p-3 bg-theme-bg rounded-lg border border-theme flex items-center justify-between group hover:border-theme-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme text-sm font-medium truncate">
                          {backup.filename}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          backup.type === 'auto' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {backup.type === 'auto' ? '自动' : '手动'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-theme-secondary">
                        <span>{formatDate(backup.createdAt)}</span>
                        <span>{formatSize(backup.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreFromList(backup)}
                      disabled={isRestoring || isLoading}
                      className="px-3 py-1.5 text-xs bg-theme-card hover:bg-theme-primary hover:text-white disabled:opacity-50 text-theme rounded-lg transition-colors"
                    >
                      恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-4 border-t border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-theme-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              建议定期创建备份
            </div>
            <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
          </div>
        </div>
      </div>

      {restoreDialog.show && restoreDialog.preview && (
        <RestoreDialog
          preview={restoreDialog.preview}
          onConfirm={handleConfirmRestore}
          onCancel={() => setRestoreDialog({ show: false, filePath: '', preview: null })}
          isRestoring={isRestoring}
        />
      )}
    </div>
  );
}
