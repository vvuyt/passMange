/**
 * 自动锁定 Hook
 * 监听用户活动并在空闲时自动锁定密码库
 */

import { useEffect, useCallback } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { resetIdleTimer, onVaultLocked } from '../utils/api';

/**
 * 用户活动事件类型
 */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

/**
 * 节流时间（毫秒）- 避免频繁调用 IPC
 */
const THROTTLE_MS = 30000; // 30秒

export function useAutoLock() {
  const { isUnlocked, lock } = useVaultStore();

  // 节流的活动处理器
  const handleActivity = useCallback(() => {
    let lastCall = 0;
    
    return () => {
      const now = Date.now();
      if (now - lastCall >= THROTTLE_MS) {
        lastCall = now;
        // 重置主进程的空闲计时器
        resetIdleTimer().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const activityHandler = handleActivity();

    // 监听用户活动事件
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, activityHandler, { passive: true });
    });

    // 监听主进程的锁定事件
    const unsubscribe = onVaultLocked(() => {
      lock();
    });

    // 初始重置计时器
    resetIdleTimer().catch(console.error);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });
      unsubscribe();
    };
  }, [isUnlocked, lock, handleActivity]);
}
