import { useEffect, useState } from 'react';
import { useVaultStore } from './stores/vaultStore';
import { checkVaultInitialized, listEntries, listCategories, listTags } from './utils/api';
import { useAutoLock } from './hooks/useAutoLock';

// 组件导入
import SetupWizard from './components/auth/SetupWizard';
import LoginScreen from './components/auth/LoginScreen';
import MainLayout from './components/MainLayout';
import TitleBar from './components/TitleBar';

function App() {
  const { isInitialized, isUnlocked, setInitialized, setUnlocked, setEntries, setCategories, setTags } = useVaultStore();
  const [isLoading, setIsLoading] = useState(true);

  // 启用自动锁定功能
  useAutoLock();

  useEffect(() => {
    // 检查密码库状态
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
          <LoginScreen onUnlock={() => setUnlocked(true)} />
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
    </div>
  );
}

export default App;
