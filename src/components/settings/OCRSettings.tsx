/**
 * OCR Settings Component
 * OCR 设置组件
 * 
 * Requirements: 5.2, 5.7
 * - 5.2: THE OCR_Engine SHALL support recognition of Chinese and English text
 * - 5.7: THE OCR_Engine SHALL support offline recognition without requiring internet connection
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getOCRLanguage,
  setOCRLanguage,
  isOCRReady,
  initializeOCR,
  type OCRLanguage,
} from '../../utils/api';

interface OCRSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: { value: OCRLanguage; label: string; description: string }[] = [
  { value: 'chi_sim+eng', label: '中英文', description: '同时识别中文和英文（推荐）' },
  { value: 'chi_sim', label: '仅中文', description: '仅识别简体中文' },
  { value: 'eng', label: '仅英文', description: '仅识别英文' },
];

export default function OCRSettings({ isOpen, onClose }: OCRSettingsProps) {
  const [language, setLanguage] = useState<OCRLanguage>('chi_sim+eng');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载配置
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [lang, ready] = await Promise.all([
        getOCRLanguage(),
        isOCRReady(),
      ]);
      setLanguage(lang);
      setIsReady(ready);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // 更改语言
  const handleLanguageChange = async (newLang: OCRLanguage) => {
    setError('');
    try {
      await setOCRLanguage(newLang);
      setLanguage(newLang);
      setSuccess('OCR 语言已更新');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // 初始化 OCR 引擎
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError('');
    try {
      await initializeOCR();
      setIsReady(true);
      setSuccess('OCR 引擎已初始化');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-card rounded-xl w-full max-w-md shadow-2xl border border-theme animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-theme">OCR 设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-secondary hover:text-theme hover:bg-theme-card rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-theme-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* 引擎状态 */}
              <div className="flex items-center justify-between p-3 bg-theme-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div>
                    <p className="text-sm text-theme">OCR 引擎状态</p>
                    <p className="text-xs text-theme-secondary">
                      {isReady ? '已就绪' : '未初始化'}
                    </p>
                  </div>
                </div>
                {!isReady && (
                  <button
                    onClick={handleInitialize}
                    disabled={isInitializing}
                    className="px-3 py-1.5 text-sm bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isInitializing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        初始化中...
                      </>
                    ) : (
                      '初始化'
                    )}
                  </button>
                )}
              </div>

              {/* 语言选择 */}
              <div>
                <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                  识别语言
                </h3>
                <div className="space-y-2">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLanguageChange(option.value)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        language === option.value
                          ? 'border-theme-primary bg-theme-primary/10'
                          : 'border-theme bg-theme-bg hover:border-theme-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            language === option.value ? 'text-theme-primary' : 'text-theme'
                          }`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-theme-secondary">{option.description}</p>
                        </div>
                        {language === option.value && (
                          <svg className="w-5 h-5 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 说明 */}
              <div className="p-3 bg-theme-bg rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-theme-secondary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-theme-secondary">
                    <p>OCR 使用 Tesseract.js 进行本地文字识别，所有数据均在本地处理，不会上传到服务器。</p>
                    <p className="mt-1">首次使用时需要下载语言包，请确保网络连接正常。</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-4 border-t border-theme">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
