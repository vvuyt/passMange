/**
 * 密码管理器 - React Native 入口
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from './services/database';
import { isVaultInitialized } from './services/vault';
import { useVaultStore } from './stores/vaultStore';
import { PasswordEntry } from './types/models';

import SetupScreen from './screens/SetupScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import EntryFormScreen from './screens/EntryFormScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import AutoLockSettingsScreen from './screens/AutoLockSettingsScreen';
import BackupScreen from './screens/BackupScreen';
import SyncScreen from './screens/SyncScreen';
import TotpSetupScreen from './screens/TotpSetupScreen';
import { useAutoLock } from './hooks/useAutoLock';

type RootStackParamList = {
  Home: undefined;
  EntryDetail: { entry: PasswordEntry };
  EntryForm: { entry?: PasswordEntry };
  Settings: undefined;
  ChangePassword: undefined;
  AutoLockSettings: undefined;
  Backup: undefined;
  Sync: undefined;
  TotpSetup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  // 启用自动锁定
  useAutoLock();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#111827' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeWrapper} />
      <Stack.Screen name="EntryDetail" component={EntryDetailWrapper} />
      <Stack.Screen name="EntryForm" component={EntryFormWrapper} />
      <Stack.Screen name="Settings" component={SettingsWrapper} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordWrapper} />
      <Stack.Screen name="AutoLockSettings" component={AutoLockSettingsWrapper} />
      <Stack.Screen name="Backup" component={BackupWrapper} />
      <Stack.Screen name="Sync" component={SyncWrapper} />
      <Stack.Screen name="TotpSetup" component={TotpSetupWrapper} />
    </Stack.Navigator>
  );
}

// 包装组件以处理导航
function HomeWrapper({ navigation }: any) {
  return (
    <HomeScreen
      onEntryPress={(entry) => navigation.navigate('EntryDetail', { entry })}
      onAddPress={() => navigation.navigate('EntryForm', {})}
      onSettingsPress={() => navigation.navigate('Settings')}
    />
  );
}

function EntryDetailWrapper({ route, navigation }: any) {
  const { entry } = route.params;
  return (
    <EntryDetailScreen
      entry={entry}
      onEdit={() => navigation.navigate('EntryForm', { entry })}
      onBack={() => navigation.goBack()}
    />
  );
}

function EntryFormWrapper({ route, navigation }: any) {
  const entry = route.params?.entry;
  return (
    <EntryFormScreen
      entry={entry}
      onSave={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}

function SettingsWrapper({ navigation }: any) {
  return (
    <SettingsScreen
      onBack={() => navigation.goBack()}
      onChangePassword={() => navigation.navigate('ChangePassword')}
      onAutoLockSettings={() => navigation.navigate('AutoLockSettings')}
      onBackup={() => navigation.navigate('Backup')}
      onSync={() => navigation.navigate('Sync')}
      onTotpSetup={() => navigation.navigate('TotpSetup')}
    />
  );
}

function ChangePasswordWrapper({ navigation }: any) {
  return (
    <ChangePasswordScreen
      onSuccess={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}

function AutoLockSettingsWrapper({ navigation }: any) {
  return <AutoLockSettingsScreen onBack={() => navigation.goBack()} />;
}

function BackupWrapper({ navigation }: any) {
  return <BackupScreen onBack={() => navigation.goBack()} />;
}

function SyncWrapper({ navigation }: any) {
  return <SyncScreen onBack={() => navigation.goBack()} />;
}

function TotpSetupWrapper({ navigation }: any) {
  return <TotpSetupScreen onBack={() => navigation.goBack()} />;
}

function AppContent() {
  const { isInitialized, isUnlocked, setInitialized } = useVaultStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // 初始化数据库
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        
        const initialized = await isVaultInitialized();
        setInitialized(initialized);
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [setInitialized]);

  if (isLoading || !dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 未初始化：显示设置向导
  if (!isInitialized) {
    return (
      <SetupScreen
        onComplete={() => {
          setInitialized(true);
        }}
      />
    );
  }

  // 未解锁：显示登录界面
  if (!isUnlocked) {
    return <LoginScreen onUnlock={() => {}} />;
  }

  // 已解锁：显示主界面
  return <MainNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
});
