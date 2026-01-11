import { useState } from 'react';
import { syncBindWithCookie } from '../../utils/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (nickname: string) => void;
}

export default function ManualCookieDialog({ open, onClose, onSuccess }: Props) {
  const [cookie, setCookie] = useState('');
  const [status, setStatus] = useState<'idle' | 'validating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const handleSubmit = async () => {
    if (!cookie.trim()) {
      setError('请输入Cookie');
      return;
    }

    setError(null);
    setStatus('validating');

    try {
      const result = await syncBindWithCookie(cookie);
      if (result.success) {
        setCookie('');
        onSuccess(result.nickname || '');
        onClose();
      } else {
        setError(result.error || 'Cookie验证失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus('idle');
    }
  };

  const handleClose = () => {
    setCookie('');
    setError(null);
    setStatus('idle');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-theme-card rounded-xl shadow-2xl max-w-lg w-full border border-theme animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-theme">手动设置Cookie</h3>
          </div>
          <button onClick={handleClose} className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 操作指引 */}
          <div className="bg-theme-bg rounded-lg border border-theme overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-theme-card/50 transition-colors"
            >
              <span className="text-sm font-medium text-theme flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                如何获取Cookie
              </span>
              <svg className={`w-4 h-4 text-theme-secondary transition-transform ${showGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showGuide && (
              <div className="px-4 pb-4 space-y-2 text-sm text-theme-secondary border-t border-theme pt-3">
                <p className="font-medium text-theme">操作步骤：</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>在浏览器中打开 <span className="text-blue-400">pan.quark.cn</span> 并登录</li>
                  <li>按 <kbd className="px-1.5 py-0.5 bg-theme-card rounded text-xs">F12</kbd> 打开开发者工具</li>
                  <li>切换到 <span className="text-theme">"网络"</span> 或 <span className="text-theme">"Network"</span> 标签</li>
                  <li>刷新页面，点击任意一个请求</li>
                  <li>在请求头中找到 <span className="text-theme">"Cookie"</span> 字段</li>
                  <li>复制完整的Cookie值粘贴到下方</li>
                </ol>
                <p className="text-xs text-amber-400 mt-2">
                  ⚠️ Cookie包含登录凭证，请勿泄露给他人
                </p>
              </div>
            )}
          </div>

          {/* Cookie输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-theme">Cookie内容</label>
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="粘贴从浏览器复制的Cookie..."
              rows={6}
              className="w-full px-3 py-2.5 bg-theme-bg border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 resize-none font-mono"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-theme flex gap-3 flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={status === 'validating'}
            className="flex-1 px-4 py-2.5 bg-theme-bg hover:bg-theme-card disabled:opacity-50 text-theme text-sm font-medium rounded-lg transition-colors border border-theme"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={status === 'validating' || !cookie.trim()}
            className="flex-1 px-4 py-2.5 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {status === 'validating' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                验证中...
              </>
            ) : (
              '验证并绑定'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
