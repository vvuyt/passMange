import { useState, useEffect, useCallback } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { 
  showOpenDialog, 
  detectFormat, 
  importFile, 
  executeImport, 
  downloadTemplate,
  listCategories
} from '../../utils/api';
import type { ImportEntry, ImportError, Category } from '../../types/electron';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select' | 'preview' | 'result';

export default function ImportWizard({ isOpen, onClose }: Props) {
  const { refreshEntries, refreshCategories } = useVaultStore();
  
  const [step, setStep] = useState<Step>('select');
  const [filePath, setFilePath] = useState('');
  const [format, setFormat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  
  const [importResult, setImportResult] = useState<{ success: number; failed: number; categoriesCreated?: number } | null>(null);

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSelectFile = async () => {
    try {
      const result = await showOpenDialog({
        title: '选择导入文件',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx', 'xls'] },
          { name: 'CSV 文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });
      
      if (result.canceled || result.filePaths.length === 0) return;
      
      const selectedPath = result.filePaths[0];
      setFilePath(selectedPath);
      setError('');
      
      setIsLoading(true);
      
      // 获取现有分类
      const categories = await listCategories();
      setExistingCategories(categories);
      
      const detectedFormat = await detectFormat(selectedPath);
      setFormat(detectedFormat);
      
      if (detectedFormat === 'unknown') {
        setError('不支持的文件格式');
        setIsLoading(false);
        return;
      }
      
      const parseResult = await importFile(selectedPath, detectedFormat);
      
      if (parseResult.errors.length > 0 && parseResult.success === 0) {
        setError(parseResult.errors[0].message);
        setIsLoading(false);
        return;
      }
      
      setEntries(parseResult.entries || []);
      setErrors(parseResult.errors);
      setDuplicates(parseResult.duplicates);
      setNewCategories(parseResult.newCategories || []);
      setStep('preview');
    } catch (err) {
      setError((err as Error).message || '解析文件失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (entries.length === 0) return;
    
    setIsLoading(true);
    try {
      const result = await executeImport(entries);
      setImportResult(result);
      setStep('result');
      
      if (result.success > 0) {
        await refreshEntries();
        await refreshCategories();
      }
    } catch (err) {
      setError((err as Error).message || '导入失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 批量修改条目分类
  const handleBatchCategoryChange = (category: string) => {
    setEntries(entries.map(entry => ({ ...entry, category })));
    // 更新新分类列表
    if (category && !existingCategories.some(c => c.name.toLowerCase() === category.toLowerCase())) {
      if (!newCategories.includes(category)) {
        setNewCategories([...newCategories, category]);
      }
    }
  };

  // 修改单个条目分类
  const handleEntryCategoryChange = (index: number, category: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], category };
    setEntries(newEntries);
    
    // 重新计算新分类
    const allCategories = new Set(newEntries.map(e => e.category).filter(Boolean) as string[]);
    const newCats = Array.from(allCategories).filter(
      cat => !existingCategories.some(c => c.name.toLowerCase() === cat.toLowerCase())
    );
    setNewCategories(newCats);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch (err) {
      setError((err as Error).message || '下载模板失败');
    }
  };

  const handleClose = () => {
    setStep('select');
    setFilePath('');
    setFormat('');
    setEntries([]);
    setErrors([]);
    setDuplicates(0);
    setNewCategories([]);
    setExistingCategories([]);
    setImportResult(null);
    setError('');
    onClose();
  };

  const getFormatLabel = (fmt: string) => {
    const labels: Record<string, string> = {
      excel: 'Excel 文件',
      chrome: 'Chrome 浏览器',
      firefox: 'Firefox 浏览器',
      edge: 'Edge 浏览器',
      csv: 'CSV 文件',
    };
    return labels[fmt] || fmt;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-2xl w-full border border-theme animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">导入密码</h2>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'select' && (
            <div className="space-y-5">
              <p className="text-theme-secondary text-sm">
                支持从 Excel 文件或浏览器导出的 CSV 文件导入密码。
              </p>

              {/* 支持的格式 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-theme-bg rounded-lg border border-theme">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="font-medium text-theme text-sm">Excel 文件</h3>
                  </div>
                  <p className="text-xs text-theme-secondary mb-2">
                    使用我们的模板格式导入
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-xs text-theme-primary hover:underline"
                  >
                    下载模板
                  </button>
                </div>
                <div className="p-4 bg-theme-bg rounded-lg border border-theme">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <h3 className="font-medium text-theme text-sm">浏览器导出</h3>
                  </div>
                  <p className="text-xs text-theme-secondary">
                    支持 Chrome、Firefox、Edge
                  </p>
                </div>
              </div>

              {/* 选择文件按钮 */}
              <div className="text-center py-4">
                <button
                  onClick={handleSelectFile}
                  disabled={isLoading}
                  className="px-6 py-3 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      解析中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      </svg>
                      选择文件
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* 文件信息 */}
              <div className="p-3 bg-theme-bg rounded-lg border border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-theme text-sm font-mono truncate max-w-[200px]">
                      {filePath.split(/[/\\]/).pop()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-theme-card rounded text-theme-secondary">
                    {getFormatLabel(format)}
                  </span>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-400">{entries.length}</p>
                  <p className="text-xs text-green-400">待导入</p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-400">{duplicates}</p>
                  <p className="text-xs text-yellow-400">重复跳过</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-400">{errors.length}</p>
                  <p className="text-xs text-red-400">错误</p>
                </div>
              </div>

              {/* 新分类提示 */}
              {newCategories.length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-blue-400 text-sm font-medium mb-1">将创建 {newCategories.length} 个新分类</p>
                      <div className="flex flex-wrap gap-1">
                        {newCategories.map((cat, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 批量分类设置 */}
              <div className="p-3 bg-theme-bg rounded-lg border border-theme">
                <div className="flex items-center gap-3">
                  <span className="text-theme-secondary text-sm">批量设置分类:</span>
                  <select
                    className="flex-1 px-3 py-1.5 bg-theme-card border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    onChange={(e) => handleBatchCategoryChange(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">-- 不修改 --</option>
                    {existingCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 错误列表 */}
              {errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="font-medium text-red-400 text-sm mb-2">错误详情</h4>
                  <ul className="text-xs text-red-400 space-y-1 max-h-24 overflow-y-auto">
                    {errors.map((err, i) => (
                      <li key={i}>
                        {err.rowNumber ? `第 ${err.rowNumber} 行: ` : ''}{err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 预览列表 */}
              {entries.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">预览 (前 10 条)</h4>
                  <div className="border border-theme rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-theme-bg">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-theme-secondary font-medium">标题</th>
                          <th className="px-3 py-2 text-left text-xs text-theme-secondary font-medium">用户名</th>
                          <th className="px-3 py-2 text-left text-xs text-theme-secondary font-medium">分类</th>
                          <th className="px-3 py-2 text-left text-xs text-theme-secondary font-medium">网址</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.slice(0, 10).map((entry, i) => (
                          <tr key={i} className="border-t border-theme">
                            <td className="px-3 py-2 text-theme text-sm">{entry.title}</td>
                            <td className="px-3 py-2 text-theme-secondary text-sm">{entry.username}</td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full px-2 py-1 bg-theme-card border border-theme rounded text-theme text-xs focus:outline-none focus:ring-1 focus:ring-theme-primary/50"
                                value={entry.category || ''}
                                onChange={(e) => handleEntryCategoryChange(i, e.target.value)}
                              >
                                <option value="">默认分类</option>
                                {existingCategories.map(cat => (
                                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                                {/* 显示新分类选项 */}
                                {entry.category && !existingCategories.some(c => c.name === entry.category) && (
                                  <option value={entry.category}>{entry.category} (新)</option>
                                )}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-theme-secondary text-sm truncate max-w-[120px]">
                              {entry.url || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entries.length > 10 && (
                      <div className="px-3 py-2 bg-theme-bg text-center text-theme-secondary text-xs">
                        还有 {entries.length - 10} 条...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-theme mb-2">导入完成</h3>
                <p className="text-theme-secondary">
                  成功导入 <span className="text-green-400 font-bold">{importResult.success}</span> 条密码
                  {importResult.failed > 0 && (
                    <>，<span className="text-red-400 font-bold">{importResult.failed}</span> 条失败</>
                  )}
                </p>
                {importResult.categoriesCreated && importResult.categoriesCreated > 0 && (
                  <p className="text-theme-secondary text-sm mt-1">
                    创建了 <span className="text-blue-400 font-bold">{importResult.categoriesCreated}</span> 个新分类
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-theme flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-theme-secondary">按 Esc 关闭</span>
          <div className="flex gap-3">
            {step === 'select' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
              >
                取消
              </button>
            )}
            
            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
                >
                  返回
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || entries.length === 0}
                  className="px-4 py-2 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoading ? '导入中...' : `导入 ${entries.length} 条`}
                </button>
              </>
            )}
            
            {step === 'result' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
