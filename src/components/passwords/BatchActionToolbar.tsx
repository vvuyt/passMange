/**
 * 批量操作工具栏
 * 显示在选择模式下，提供批量移动分类、添加/移除标签、删除功能
 */

import { useState } from 'react';
import { useSelectionStore } from '../../stores/selection-store';
import { useVaultStore } from '../../stores/vaultStore';
import { batchMoveCategory, batchAddTags, batchDelete } from '../../utils/api';

interface Props {
  onOperationComplete: () => void;
}

export default function BatchActionToolbar({ onOperationComplete }: Props) {
  const { selectedIds, clearSelection, exitSelectionMode } = useSelectionStore();
  const { categories, tags, refreshEntries } = useVaultStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleMoveCategory = async (categoryId: string | null) => {
    setIsLoading(true);
    setShowCategoryMenu(false);
    try {
      const result = await batchMoveCategory(selectedArray, categoryId);
      if (result.success > 0) {
        showMessage('success', `成功移动 ${result.success} 条`);
        await refreshEntries();
        onOperationComplete();
      }
      if (result.failed > 0) {
        showMessage('error', `${result.failed} 条移动失败`);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTags = async (tagIds: string[]) => {
    setIsLoading(true);
    setShowTagMenu(false);
    try {
      const result = await batchAddTags(selectedArray, tagIds);
      if (result.success > 0) {
        showMessage('success', `成功添加标签到 ${result.success} 条`);
        await refreshEntries();
        onOperationComplete();
      }
      if (result.failed > 0) {
        showMessage('error', `${result.failed} 条添加失败`);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setShowDeleteConfirm(false);
    try {
      const result = await batchDelete(selectedArray);
      if (result.success > 0) {
        showMessage('success', `成功删除 ${result.success} 条`);
        clearSelection();
        await refreshEntries();
        onOperationComplete();
      }
      if (result.failed > 0) {
        showMessage('error', `${result.failed} 条删除失败`);
      }
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    exitSelectionMode();
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-theme-primary/10 border-b border-theme-primary/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-theme-primary text-sm font-medium">
          已选择 {selectedCount} 项
        </span>
        
        {/* 移动到分类 */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-theme-card hover:bg-theme-bg text-theme text-sm rounded-lg border border-theme transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            移动到分类
          </button>
          
          {showCategoryMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-theme-card border border-theme rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => handleMoveCategory(null)}
                className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-bg transition-colors"
              >
                无分类
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleMoveCategory(cat.id)}
                  className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-bg transition-colors flex items-center gap-2"
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 添加标签 */}
        <div className="relative">
          <button
            onClick={() => setShowTagMenu(!showTagMenu)}
            disabled={isLoading || tags.length === 0}
            className="px-3 py-1.5 bg-theme-card hover:bg-theme-bg text-theme text-sm rounded-lg border border-theme transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            添加标签
          </button>
          
          {showTagMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-theme-card border border-theme rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTags([tag.id])}
                  className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-bg transition-colors flex items-center gap-2"
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: tag.color || '#6b7280' }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 删除 */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isLoading}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg border border-red-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* 消息提示 */}
        {message && (
          <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </span>
        )}
        
        {/* 取消按钮 */}
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-theme-secondary hover:text-theme text-sm transition-colors"
        >
          取消选择
        </button>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-theme-card rounded-xl p-6 max-w-sm w-full mx-4 border border-theme">
            <h3 className="text-lg font-semibold text-theme mb-2">确认删除</h3>
            <p className="text-theme-secondary text-sm mb-4">
              确定要删除选中的 {selectedCount} 条密码吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-theme-bg hover:bg-theme-card text-theme text-sm rounded-lg border border-theme transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
