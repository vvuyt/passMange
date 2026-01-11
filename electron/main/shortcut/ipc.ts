/**
 * Shortcut IPC Handlers
 * 快捷键 IPC 处理器
 */

import { ipcMain } from 'electron';
import shortcutModule, { isValidAccelerator, updateShortcut, getConfig, setConfig, ShortcutConfig } from './index';
import { loadShortcutConfig, saveShortcutConfig, updateShortcutConfig } from './config';

// IPC 通道名称
export const IPC_CHANNELS = {
  SHORTCUT_UPDATE: 'shortcut:update',
  SHORTCUT_GET_CONFIG: 'shortcut:get-config',
  SHORTCUT_VALIDATE: 'shortcut:validate',
  SHORTCUT_SET_ENABLED: 'shortcut:set-enabled',
  SHORTCUT_RESET: 'shortcut:reset',
};

/**
 * 注册快捷键 IPC 处理器
 */
export function registerShortcutIPC(): void {
  // 获取快捷键配置
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_GET_CONFIG, async () => {
    try {
      const config = loadShortcutConfig();
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 更新快捷键
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_UPDATE, async (_, action: string, accelerator: string) => {
    try {
      // 验证格式
      if (!isValidAccelerator(accelerator)) {
        return { success: false, error: '无效的快捷键格式' };
      }

      // 获取回调函数
      const { quickEntryModule } = require('../quickentry');
      const { mainWindow } = require('../index');
      
      const callbacks: Record<string, () => void> = {
        quickEntry: () => quickEntryModule.show(),
        screenshot: () => mainWindow?.webContents.send('trigger-screenshot-ocr'),
      };
      
      const callback = callbacks[action];
      if (!callback) {
        return { success: false, error: '未知的快捷键动作' };
      }

      // 更新快捷键（会先注销旧的，再注册新的）
      const success = updateShortcut(action, accelerator, callback);
      if (!success) {
        return { success: false, error: '快捷键注册失败，可能与其他应用冲突' };
      }

      // 保存配置
      const config = loadShortcutConfig();
      if (action === 'quickEntry') {
        config.quickEntry = accelerator;
      } else if (action === 'screenshot') {
        config.screenshot = accelerator;
      }
      saveShortcutConfig(config);
      setConfig(config);

      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 验证快捷键格式
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_VALIDATE, async (_, accelerator: string) => {
    try {
      const isValid = isValidAccelerator(accelerator);
      return { success: true, isValid };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 启用/禁用快捷键
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_SET_ENABLED, async (_, enabled: boolean) => {
    try {
      const config = updateShortcutConfig({ enabled });
      setConfig(config);

      if (enabled) {
        // 清理旧的快捷键
        shortcutModule.cleanup();
        
        // 重新注册快捷键 - 需要从主进程获取回调
        const { quickEntryModule } = require('../quickentry');
        const { mainWindow } = require('../index');
        
        shortcutModule.initialize({
          onQuickEntry: () => {
            quickEntryModule.show();
          },
          onScreenshot: () => {
            mainWindow?.webContents.send('trigger-screenshot-ocr');
          },
        });
      } else {
        // 清理所有快捷键
        shortcutModule.cleanup();
      }

      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 重置为默认配置
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_RESET, async () => {
    try {
      const defaultConfig: ShortcutConfig = {
        quickEntry: 'CommandOrControl+Shift+P',
        screenshot: 'CommandOrControl+Shift+O',
        enabled: true,
      };

      saveShortcutConfig(defaultConfig);
      setConfig(defaultConfig);

      // 重新注册默认快捷键
      shortcutModule.cleanup();
      
      const { quickEntryModule } = require('../quickentry');
      const { mainWindow } = require('../index');
      
      shortcutModule.initialize({
        onQuickEntry: () => {
          quickEntryModule.show();
        },
        onScreenshot: () => {
          mainWindow?.webContents.send('trigger-screenshot-ocr');
        },
      });
      
      return { success: true, config: defaultConfig };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Shortcut IPC handlers registered');
}

/**
 * 注销快捷键 IPC 处理器
 */
export function unregisterShortcutIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.SHORTCUT_GET_CONFIG);
  ipcMain.removeHandler(IPC_CHANNELS.SHORTCUT_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.SHORTCUT_VALIDATE);
  ipcMain.removeHandler(IPC_CHANNELS.SHORTCUT_SET_ENABLED);
  ipcMain.removeHandler(IPC_CHANNELS.SHORTCUT_RESET);
}

export default {
  registerShortcutIPC,
  unregisterShortcutIPC,
  IPC_CHANNELS,
};
