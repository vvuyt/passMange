/**
 * OCR Preview Component
 * OCR 预览组件 - 显示识别结果和解析的凭证，允许用户确认或修改
 * 
 * Requirements: 6.4, 6.5, 6.6
 * - 6.4: WHEN credentials are parsed, THE Credential_Parser SHALL present them to the user for confirmation before saving
 * - 6.5: WHEN multiple credential pairs are detected, THE Credential_Parser SHALL allow the user to select which ones to save
 * - 6.6: THE Credential_Parser SHALL allow manual correction of parsed results
 */

import { useState, useEffect, useCallback } from 'react';
import { createEntry } from '../../utils/api';
import { useVaultStore } from '../../stores/vaultStore';
import type { PasswordEntry } from '../../types/electron';

// 解析的凭证接口
export interface ParsedCredential {
  username?: string;
  password?: string;
  siteName?: string;
  confidence: number;
}

// OCR 结果接口
export interface OCRResult {
  success: boolean;
  text: string;
  blocks: Array<{
    text: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  confidence: number;
  error?: string;
}

interface OCRPreviewProps {
  ocrResult: OCRResult;
  credentials: ParsedCredential[];
  imageData?: string; // base64 图片数据
  onClose: () => void;
  onSaveComplete?: () => void;
}

// 可编辑的凭证状态
interface EditableCredential extends ParsedCredential {
  id: string;
  selected: boolean;
  isEditing: boolean;
}

export default function OCRPreview({
  ocrResult,
  credentials,
  imageData,
  onClose,
  onSaveComplete,
}: OCRPreviewProps) {
  const { addEntry, categories } = useVaultStore();
  
  // 将解析的凭证转换为可编辑状态
  const [editableCredentials, setEditableCredentials] = useState<EditableCredential[]>(() =>
    credentials.map((cred, index) => ({
      ...cred,
      id: `cred-${index}`,
      selected: true,
      isEditing: false,
    }))
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveResults, setSaveResults] = useState<{ success: number; failed: number } | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 切换凭证选中状态
  const toggleCredentialSelection = (id: string) => {
    setEditableCredentials(prev =>
      prev.map(cred =>
        cred.id === id ? { ...cred, selected: !cred.selected } : cred
      )
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const allSelected = editableCredentials.every(c => c.selected);
    setEditableCredentials(prev =>
      prev.map(cred => ({ ...cred, selected: !allSelected }))
    );
  };

  // 更新凭证字段
  const updateCredentialField = (
    id: string,
    field: 'username' | 'password' | 'siteName',
    value: string
  ) => {
    setEditableCredentials(prev =>
      prev.map(cred =>
        cred.id === id ? { ...cred, [field]: value } : cred
      )
    );
  };

  // 切换编辑模式
  const toggleEditMode = (id: string) => {
    setEditableCredentials(prev =>
      prev.map(cred =>
        cred.id === id ? { ...cred, isEditing: !cred.isEditing } : cred
      )
    );
  };

  // 删除凭证
  const removeCredential = (id: string) => {
    setEditableCredentials(prev => prev.filter(cred => cred.id !== id));
  };

  // 添加新凭证（手动添加）
  const addNewCredential = () => {
    const newId = `cred-${Date.now()}`;
    setEditableCredentials(prev => [
      ...prev,
      {
        id: newId,
        username: '',
        password: '',
        siteName: '',
        confidence: 1,
        selected: true,
        isEditing: true,
      },
    ]);
  };

  // 保存选中的凭证
  const handleSave = async () => {
    const selectedCredentials = editableCredentials.filter(c => c.selected);
    
    if (selectedCredentials.length === 0) {
      setError('请至少选择一个凭证');
      return;
    }

    // 验证必填字段
    for (const cred of selectedCredentials) {
      if (!cred.siteName?.trim()) {
        setError('网站/应用名称不能为空');
        return;
      }
      if (!cred.username?.trim() && !cred.password?.trim()) {
        setError('用户名和密码不能同时为空');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    
    let successCount = 0;
    let failedCount = 0;

    for (const cred of selectedCredentials) {
      try {
        const id = await createEntry({
          title: cred.siteName?.trim() || '未命名',
          username: cred.username?.trim() || '',
          password: cred.password || '',
          categoryId: categoryId || undefined,
          tags: [],
          favorite: false,
        });

        const newEntry: PasswordEntry = {
          id,
          title: cred.siteName?.trim() || '未命名',
          username: cred.username?.trim() || '',
          password: cred.password || '',
          categoryId: categoryId || undefined,
          tags: [],
          favorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        addEntry(newEntry);
        successCount++;
      } catch (err) {
        console.error('保存凭证失败:', err);
        failedCount++;
      }
    }

    setIsLoading(false);
    setSaveResults({ success: successCount, failed: failedCount });

    if (successCount > 0 && failedCount === 0) {
      // 全部成功，延迟关闭
      setTimeout(() => {
        onSaveComplete?.();
        onClose();
      }, 1500);
    }
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // 获取置信度文本
  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.5) return '中';
    return '低';
  };

  const selectedCount = editableCredentials.filter(c => c.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 modal-backdrop">
      <div className="w-full max-w-4xl max-h-[90vh] bg-theme-bg rounded-xl shadow-2xl flex flex-col modal-content">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme">OCR 识别结果</h2>
              <p className="text-sm text-theme-secondary">
                识别置信度: <span className={getConfidenceColor(ocrResult.confidence)}>
                  {Math.round(ocrResult.confidence * 100)}% ({getConfidenceText(ocrResult.confidence)})
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-card rounded-lg transition-colors text-theme-secondary hover:text-theme"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：图片预览和原始文本 */}
          <div className="w-2/5 border-r border-theme flex flex-col">
            {/* 图片预览 */}
            {imageData && (
              <div className="p-4 border-b border-theme">
                <p className="text-sm text-theme-secondary mb-2">截图预览</p>
                <div className="bg-theme-card rounded-lg p-2 max-h-48 overflow-auto">
                  <img
                    src={`data:image/png;base64,${imageData}`}
                    alt="OCR 截图"
                    className="max-w-full h-auto rounded"
                  />
                </div>
              </div>
            )}
            
            {/* 原始识别文本 */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-theme-secondary">识别文本</p>
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs text-theme-primary hover:underline"
                >
                  {showRawText ? '收起' : '展开'}
                </button>
              </div>
              {showRawText && (
                <div className="flex-1 bg-theme-card rounded-lg p-3 overflow-auto">
                  <pre className="text-sm text-theme whitespace-pre-wrap font-mono">
                    {ocrResult.text || '未识别到文本'}
                  </pre>
                </div>
              )}
              {!showRawText && (
                <div className="bg-theme-card rounded-lg p-3">
                  <p className="text-sm text-theme-secondary line-clamp-3">
                    {ocrResult.text?.substring(0, 150) || '未识别到文本'}
                    {ocrResult.text && ocrResult.text.length > 150 && '...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：解析的凭证列表 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 工具栏 */}
            <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableCredentials.length > 0 && editableCredentials.every(c => c.selected)}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-theme text-theme-primary focus:ring-theme-primary"
                  />
                  <span className="text-sm text-theme">
                    全选 ({selectedCount}/{editableCredentials.length})
                  </span>
                </label>
              </div>
              <button
                onClick={addNewCredential}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                手动添加
              </button>
            </div>

            {/* 凭证列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {editableCredentials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-theme-secondary">
                  <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">未识别到凭证信息</p>
                  <button
                    onClick={addNewCredential}
                    className="mt-3 text-sm text-theme-primary hover:underline"
                  >
                    手动添加凭证
                  </button>
                </div>
              ) : (
                editableCredentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    onToggleSelect={() => toggleCredentialSelection(cred.id)}
                    onToggleEdit={() => toggleEditMode(cred.id)}
                    onUpdate={(field, value) => updateCredentialField(cred.id, field, value)}
                    onRemove={() => removeCredential(cred.id)}
                  />
                ))
              )}
            </div>

            {/* 分类选择 */}
            {categories.length > 0 && editableCredentials.length > 0 && (
              <div className="px-4 py-3 border-t border-theme">
                <label className="flex items-center gap-3">
                  <span className="text-sm text-theme-secondary">保存到分类:</span>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 px-3 py-1.5 input-theme rounded-lg text-sm"
                  >
                    <option value="">未分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-theme">
          {/* 错误提示 */}
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 保存结果 */}
          {saveResults && (
            <div className={`mb-3 p-3 rounded-lg ${
              saveResults.failed === 0 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <p className={saveResults.failed === 0 ? 'text-green-400' : 'text-yellow-400'}>
                保存完成: 成功 {saveResults.success} 个
                {saveResults.failed > 0 && `, 失败 ${saveResults.failed} 个`}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-theme-secondary">
              {ocrResult.confidence < 0.5 && (
                <span className="text-yellow-400">
                  ⚠️ 识别置信度较低，建议检查结果
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || selectedCount === 0}
                className="px-6 py-2 text-sm bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    保存中...
                  </>
                ) : (
                  <>保存选中 ({selectedCount})</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// 凭证卡片组件
interface CredentialCardProps {
  credential: EditableCredential;
  onToggleSelect: () => void;
  onToggleEdit: () => void;
  onUpdate: (field: 'username' | 'password' | 'siteName', value: string) => void;
  onRemove: () => void;
}

function CredentialCard({
  credential,
  onToggleSelect,
  onToggleEdit,
  onUpdate,
  onRemove,
}: CredentialCardProps) {
  const [showPassword, setShowPassword] = useState(false);

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={`rounded-lg border transition-all ${
        credential.selected
          ? 'border-theme-primary/50 bg-theme-primary/5'
          : 'border-theme bg-theme-card'
      }`}
    >
      {/* 卡片头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme/50">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={credential.selected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-theme text-theme-primary focus:ring-theme-primary"
          />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConfidenceColor(credential.confidence)}`} />
            <span className="text-sm text-theme-secondary">
              置信度 {Math.round(credential.confidence * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleEdit}
            className={`p-1.5 rounded transition-colors ${
              credential.isEditing
                ? 'bg-theme-primary/20 text-theme-primary'
                : 'hover:bg-theme-card text-theme-secondary hover:text-theme'
            }`}
            title={credential.isEditing ? '完成编辑' : '编辑'}
          >
            {credential.isEditing ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-theme-secondary hover:text-red-400"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="p-4 space-y-3">
        {/* 网站名称 */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-theme-secondary shrink-0">网站名称</label>
          {credential.isEditing ? (
            <input
              type="text"
              value={credential.siteName || ''}
              onChange={(e) => onUpdate('siteName', e.target.value)}
              className="flex-1 px-3 py-1.5 input-theme rounded text-sm"
              placeholder="输入网站/应用名称"
            />
          ) : (
            <span className="text-sm text-theme">
              {credential.siteName || <span className="text-theme-secondary italic">未设置</span>}
            </span>
          )}
        </div>

        {/* 用户名 */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-theme-secondary shrink-0">用户名</label>
          {credential.isEditing ? (
            <input
              type="text"
              value={credential.username || ''}
              onChange={(e) => onUpdate('username', e.target.value)}
              className="flex-1 px-3 py-1.5 input-theme rounded text-sm"
              placeholder="输入用户名"
            />
          ) : (
            <span className="text-sm text-theme font-mono">
              {credential.username || <span className="text-theme-secondary italic">未识别</span>}
            </span>
          )}
        </div>

        {/* 密码 */}
        <div className="flex items-center gap-3">
          <label className="w-20 text-sm text-theme-secondary shrink-0">密码</label>
          {credential.isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credential.password || ''}
                onChange={(e) => onUpdate('password', e.target.value)}
                className="flex-1 px-3 py-1.5 input-theme rounded text-sm font-mono"
                placeholder="输入密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-theme-secondary hover:text-theme transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme font-mono">
                {credential.password ? (
                  showPassword ? credential.password : '••••••••'
                ) : (
                  <span className="text-theme-secondary italic">未识别</span>
                )}
              </span>
              {credential.password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-theme-secondary hover:text-theme transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
