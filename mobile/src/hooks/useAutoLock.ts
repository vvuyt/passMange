/**
 * 自动锁定 Hook
 * 应用切到后台或空闲超时后自动锁定密码库
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { useVaultStore } from '../stores/vaultStore';
import { lockVault } from '../services/vault';

const storage = new MMKV();
const AUTO_LOCK_KEY = 'auto_lock_timeout';
const DEFAULT_TIMEOUT = 5; // 默认 5 分钟

/**
 * 获取自动锁定超时时间（分钟）
 */
export function getAutoLockTimeout(): number {
  return storage.getNumber(AUTO_LOCK_KEY) ?? DEFAULT_TIMEOUT;
}

/**
 * 设置自动锁定超时时间（分钟）
 */
export function setAutoLockTimeout(minutes: number): void {
  storage.set(AUTO_LOCK_KEY, minutes);
}

/**
 * 自动锁定 Hook
 */
export function useAutoLock() {
  const { isUnlocked, lock } = useVaultStore();
  const backgroundTimeRef = useRef<number | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 重置空闲计时器
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    const timeout = getAutoLockTimeout();
    if (timeout > 0 && isUnlocked) {
      idleTimerRef.current = setTimeout(() => {
        lockVault();
        lock();
      }, timeout * 60 * 1000);
    }
  };

  // 监听应用状态变化
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isUnlocked) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 记录进入后台的时间
        backgroundTimeRef.current = Date.now();
      } else if (nextAppState === 'active') {
        // 从后台返回，检查是否超时
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          const timeout = getAutoLockTimeout() * 60 * 1000;

          if (timeout > 0 && elapsed >= timeout) {
            lockVault();
            lock();
          }
          backgroundTimeRef.current = null;
        }
        // 重置空闲计时器
        resetIdleTimer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 初始化空闲计时器
    if (isUnlocked) {
      resetIdleTimer();
    }

    return () => {
      subscription.remove();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isUnlocked, lock]);

  return { resetIdleTimer };
}
