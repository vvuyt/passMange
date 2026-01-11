import { useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { deleteEntry, copyToClipboard } from '../../utils/api';
import Avatar from '../common/Avatar';
import { ShareDialog } from '../share';

interface Props {
  entryId: string;
  onEdit: () => void;
  onDeleted: () => void;
  onBack?: () => void;
}

export default function PasswordDetail({ entryId, onEdit, onDeleted, onBack }: Props) {
  const { entries, categories, removeEntry } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const entry = entries.find((e) => e.id === entryId);
  const category = entry?.categoryId ? categories.find((c) => c.id === entry.categoryId) : null;

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-theme-secondary">条目不存在</div>
      </div>
    );
  }

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text, 30);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async () => {
    if (confirm('确定要删除这个密码条目吗？')) {
      await deleteEntry(entryId);
      removeEntry(entryId);
      onDeleted();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between p-4 border-b border-theme flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-theme-card rounded-lg transition-all duration-200 text-theme-secondary hover:text-theme hover:scale-105"
              title="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-sm text-theme-secondary">详情</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowShare(true)}
            className="p-2 hover:bg-theme-card rounded-lg transition-all duration-200 text-theme-secondary hover:text-theme hover:scale-105"
            title="分享"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-theme-card rounded-lg transition-all duration-200 text-theme-secondary hover:text-theme hover:scale-105"
            title="编辑"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-theme-secondary hover:text-red-400"
            title="删除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 头部信息 */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar title={entry.title} icon={entry.icon} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-theme truncate">{entry.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {category && (
                <span className="text-sm text-theme-secondary">
                  {category.icon} {category.name}
                </span>
              )}
              {category && entry.url && <span className="text-theme-secondary">·</span>}
              {entry.url && (
                <a 
                  href={entry.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-theme-secondary hover:text-theme-primary truncate"
                >
                  {entry.url.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 字段列表 */}
        <div className="space-y-4">
          {/* 用户名 */}
          <div className="group">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-theme-secondary uppercase tracking-wider">用户名</span>
            </div>
            <div className="flex items-center gap-2 bg-theme-card rounded-lg p-3">
              <span className="flex-1 text-theme truncate">{entry.username || '-'}</span>
              {entry.username && (
                <button
                  onClick={() => handleCopy(entry.username, 'username')}
                  className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                    copied === 'username' 
                      ? 'text-green-400 bg-green-500/10' 
                      : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                  }`}
                  title={copied === 'username' ? '已复制' : '复制'}
                >
                  {copied === 'username' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 密码 */}
          <div className="group">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-theme-secondary uppercase tracking-wider">密码</span>
            </div>
            <div className="flex items-center gap-2 bg-theme-card rounded-lg p-3">
              <span className="flex-1 text-theme font-mono truncate">
                {showPassword ? entry.password : '••••••••••••'}
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded text-theme-secondary hover:text-theme hover:bg-theme-card transition-colors flex-shrink-0"
                title={showPassword ? '隐藏' : '显示'}
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
              <button
                onClick={() => handleCopy(entry.password, 'password')}
                className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                  copied === 'password' 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                }`}
                title={copied === 'password' ? '已复制' : '复制'}
              >
                {copied === 'password' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 网址 */}
          {entry.url && (
            <div className="group">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">网址</span>
              </div>
              <div className="flex items-center gap-2 bg-theme-card rounded-lg p-3">
                <a 
                  href={entry.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 text-theme-primary hover:underline truncate"
                >
                  {entry.url}
                </a>
                <button
                  onClick={() => handleCopy(entry.url!, 'url')}
                  className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                    copied === 'url' 
                      ? 'text-green-400 bg-green-500/10' 
                      : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                  }`}
                  title={copied === 'url' ? '已复制' : '复制'}
                >
                  {copied === 'url' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 备注 */}
          {entry.notes && (
            <div className="group">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-theme-secondary uppercase tracking-wider">备注</span>
              </div>
              <div className="bg-theme-card rounded-lg p-3">
                <p className="text-theme text-sm whitespace-pre-wrap">{entry.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部时间信息 */}
        <div className="mt-8 pt-4 border-t border-theme">
          <div className="flex items-center gap-4 text-xs text-theme-secondary">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>创建于 {new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>更新于 {new Date(entry.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 分享对话框 */}
      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        entryId={entryId}
        entryTitle={entry.title}
      />
    </div>
  );
}
