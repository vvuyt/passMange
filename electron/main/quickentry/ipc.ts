/**
 * Quick Entry IPC Handlers
 * 快速录入 IPC 处理器
 */

import { ipcMain } from 'electron';
import quickEntryModule, { QuickEntryData } from './index';

// IPC 通道名称
export const IPC_CHANNELS = {
  QUICK_ENTRY_SHOW: 'quick-entry:show',
  QUICK_ENTRY_HIDE: 'quick-entry:hide',
  QUICK_ENTRY_CLOSE: 'quick-entry:close',
  QUICK_ENTRY_GET_ACTIVE_APP: 'quick-entry:get-active-app',
  QUICK_ENTRY_PREFILL: 'quick-entry:prefill',
  QUICK_ENTRY_IS_VISIBLE: 'quick-entry:is-visible',
};

/**
 * 注册快速录入 IPC 处理器
 */
export function registerQuickEntryIPC(): void {
  // 显示快速录入窗口
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_SHOW, async (_, position?: { x: number; y: number }) => {
    try {
      quickEntryModule.show(position);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 隐藏快速录入窗口
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_HIDE, async () => {
    try {
      quickEntryModule.hide();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 关闭快速录入窗口
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_CLOSE, async () => {
    try {
      quickEntryModule.close();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 获取当前活动应用名称
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_GET_ACTIVE_APP, async () => {
    try {
      const appName = await quickEntryModule.getActiveAppName();
      return { success: true, appName };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 预填充数据
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_PREFILL, async (_, data: Partial<QuickEntryData>) => {
    try {
      quickEntryModule.prefillData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 检查窗口是否可见
  ipcMain.handle(IPC_CHANNELS.QUICK_ENTRY_IS_VISIBLE, async () => {
    try {
      const isVisible = quickEntryModule.isVisible();
      return { success: true, isVisible };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Quick Entry IPC handlers registered');
}

/**
 * 注销快速录入 IPC 处理器
 */
export function unregisterQuickEntryIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_SHOW);
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_HIDE);
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_CLOSE);
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_GET_ACTIVE_APP);
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_PREFILL);
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_ENTRY_IS_VISIBLE);
}

export default {
  registerQuickEntryIPC,
  unregisterQuickEntryIPC,
  IPC_CHANNELS,
};
