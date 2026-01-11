import { useEffect, useState } from 'react';
import { useVaultStore } from './stores/vaultStore';
import { checkVaultInitialized, listEntries, listCategories, listTags } from './utils/api';
import { useAutoLock } from './hooks/useAutoLock';

// 组件导入
import SetupWizard from './components/auth/SetupWizard';
import LoginScreen from './components/auth/LoginScreen';
import MainLayout from './components/MainLayout';
import TitleBar from './components/TitleBar';
import QuickEntryForm from './components/quickentry/QuickEntryForm';
import OCRPreview, { OCRResult, ParsedCredential } from './components/ocr/OCRPreview';

// 检查是否是快速录入窗口（在组件外部检查，避免 hooks 问题）
const isQuickEntryWindow = window.location.hash === '#/quick-entry' || window.location.hash === '#quick-entry';

// 快速录入窗口组件
function QuickEntryApp() {
  return (
    <div className="h-screen bg-theme-bg overflow-hidden">
      <QuickEntryForm />
    </div>
  );
}

// 主应用组件
function MainApp() {
  const { isInitialized, isUnlocked, setInitialized, setUnlocked, setEntries, setCategories, setTags } = useVaultStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // OCR 相关状态
  const [showOCRPreview, setShowOCRPreview] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrCredentials, setOcrCredentials] = useState<ParsedCredential[]>([]);
  const [ocrImageData, setOcrImageData] = useState<string | undefined>();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // 启用自动锁定功能
  useAutoLock();

  // 检查密码库状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const initialized = await checkVaultInitialized();
        setInitialized(initialized);
      } catch (error) {
        console.error('Failed to check vault status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [setInitialized]);

  // 解锁后加载数据
  useEffect(() => {
    if (isUnlocked) {
      const loadData = async () => {
        try {
          const [entries, categories, tags] = await Promise.all([
            listEntries(),
            listCategories(),
            listTags(),
          ]);
          setEntries(entries);
          setCategories(categories);
          setTags(tags);
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      };
      loadData();
    }
  }, [isUnlocked, setEntries, setCategories, setTags]);

  // 监听截图快捷键事件
  useEffect(() => {
    const handleScreenshotTrigger = async () => {
      if (!isUnlocked) {
        setOcrError('请先解锁密码库');
        return;
      }
      
      setOcrLoading(true);
      setOcrError(null);
      
      try {
        // 从剪贴板识别图片
        // @ts-ignore
        const result: any = await window.electronAPI?.ocrRecognizeClipboard?.();
        
        if (!result || !result.success) {
          setOcrError(result?.error || '识别失败，请先截图并复制到剪贴板');
          setOcrLoading(false);
          return;
        }
        
        // 获取剪贴板图片数据用于预览
        // @ts-ignore
        const clipboardResult: any = await window.electronAPI?.invoke?.('screenshot:from-clipboard');
        
        // 构造完整的 OCRResult
        const ocrResultData: OCRResult = {
          success: result.success,
          text: result.text || '',
          blocks: result.blocks || [],
          confidence: result.confidence || 0,
          error: result.error,
        };
        
        setOcrResult(ocrResultData);
        setOcrCredentials((result.credentials || []) as ParsedCredential[]);
        setOcrImageData(clipboardResult?.imageData);
        setShowOCRPreview(true);
      } catch (err) {
        console.error('OCR failed:', err);
        setOcrError((err as Error).message || '识别失败');
      } finally {
        setOcrLoading(false);
      }
    };

    // @ts-ignore
    window.electronAPI?.on?.('trigger-screenshot-ocr', handleScreenshotTrigger);

    return () => {
      // @ts-ignore
      window.electronAPI?.off?.('trigger-screenshot-ocr', handleScreenshotTrigger);
    };
  }, [isUnlocked]);

  if (isLoading) {
    return (
      <div className="h-screen bg-theme-bg flex flex-col">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-theme text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  // 未初始化：显示设置向导
  if (!isInitialized) {
    return (
      <div className="h-screen bg-theme-bg flex flex-col">
        <TitleBar />
        <div className="flex-1">
          <SetupWizard onComplete={() => { setInitialized(true); setUnlocked(true); }} />
        </div>
      </div>
    );
  }

  // 未解锁：显示登录界面
  if (!isUnlocked) {
    return (
      <div className="h-screen bg-theme-bg flex flex-col">
        <TitleBar />
        <div className="flex-1">
          <LoginScreen 
            onUnlock={() => setUnlocked(true)} 
            onReset={() => setInitialized(false)}
          />
        </div>
      </div>
    );
  }

  // 已解锁：显示主界面
  return (
    <div className="h-screen bg-theme-bg flex flex-col">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <MainLayout />
      </div>
      
      {/* OCR 加载提示 */}
      {ocrLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-theme-bg rounded-xl p-6 flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-theme">正在识别剪贴板图片...</p>
          </div>
        </div>
      )}
      
      {/* OCR 错误提示 */}
      {ocrError && !ocrLoading && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{ocrError}</span>
          <button onClick={() => setOcrError(null)} className="ml-2 hover:opacity-80">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* OCR 预览弹窗 */}
      {showOCRPreview && ocrResult && (
        <OCRPreview
          ocrResult={ocrResult}
          credentials={ocrCredentials}
          imageData={ocrImageData}
          onClose={() => {
            setShowOCRPreview(false);
            setOcrResult(null);
            setOcrCredentials([]);
            setOcrImageData(undefined);
          }}
        />
      )}
    </div>
  );
}

function App() {
  // 如果是快速录入窗口，渲染快速录入组件
  if (isQuickEntryWindow) {
    return <QuickEntryApp />;
  }
  
  // 否则渲染主应用
  return <MainApp />;
}

export default App;
