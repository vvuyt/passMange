/**
 * Tray IPC Handlers
 * 托盘 IPC 处理器
 */

import { ipcMain } from 'electron';
import { loadTrayConfig, saveTrayConfig, updateTrayConfig, TrayConfig } from './config';

// IPC 通道名称
export const IPC_CHANNELS = {
  TRAY_GET_CONFIG: 'tray:get-config',
  TRAY_UPDATE_CONFIG: 'tray:update-config',
  TRAY_SET_MINIMIZE_TO_TRAY: 'tray:set-minimize-to-tray',
  TRAY_SET_CLOSE_TO_TRAY: 'tray:set-close-to-tray',
};

/**
 * 注册托盘 IPC 处理器
 */
export function registerTrayIPC(): void {
  // 获取托盘配置
  ipcMain.handle(IPC_CHANNELS.TRAY_GET_CONFIG, async () => {
    try {
      const config = loadTrayConfig();
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 更新托盘配置
  ipcMain.handle(IPC_CHANNELS.TRAY_UPDATE_CONFIG, async (_, updates: Partial<TrayConfig>) => {
    try {
      const config = updateTrayConfig(updates);
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 设置最小化到托盘
  ipcMain.handle(IPC_CHANNELS.TRAY_SET_MINIMIZE_TO_TRAY, async (_, enabled: boolean) => {
    try {
      const config = updateTrayConfig({ minimizeToTray: enabled });
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 设置关闭到托盘
  ipcMain.handle(IPC_CHANNELS.TRAY_SET_CLOSE_TO_TRAY, async (_, enabled: boolean) => {
    try {
      const config = updateTrayConfig({ closeToTray: enabled });
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Tray IPC handlers registered');
}

/**
 * 注销托盘 IPC 处理器
 */
export function unregisterTrayIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.TRAY_GET_CONFIG);
  ipcMain.removeHandler(IPC_CHANNELS.TRAY_UPDATE_CONFIG);
  ipcMain.removeHandler(IPC_CHANNELS.TRAY_SET_MINIMIZE_TO_TRAY);
  ipcMain.removeHandler(IPC_CHANNELS.TRAY_SET_CLOSE_TO_TRAY);
}

export default {
  registerTrayIPC,
  unregisterTrayIPC,
  IPC_CHANNELS,
};
