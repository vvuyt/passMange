/**
 * Screenshot IPC Handlers
 * 截图 IPC 处理器
 */

import { ipcMain } from 'electron';
import screenshotModule from './index';

// IPC 通道名称
export const IPC_CHANNELS = {
  SCREENSHOT_CAPTURE: 'screenshot:capture',
  SCREENSHOT_FROM_CLIPBOARD: 'screenshot:from-clipboard',
  SCREENSHOT_FROM_FILE: 'screenshot:from-file',
  SCREENSHOT_VALIDATE: 'screenshot:validate',
};

/**
 * 注册截图 IPC 处理器
 */
export function registerScreenshotIPC(): void {
  // 捕获屏幕
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_CAPTURE, async () => {
    try {
      const result = await screenshotModule.captureRegion();
      if (result.success && result.imageBuffer) {
        // 将 Buffer 转换为 base64 以便传输
        return {
          success: true,
          imageData: result.imageBuffer.toString('base64'),
        };
      }
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 从剪贴板获取图片
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_FROM_CLIPBOARD, async () => {
    try {
      const result = await screenshotModule.getFromClipboard();
      if (result.success && result.imageBuffer) {
        return {
          success: true,
          imageData: result.imageBuffer.toString('base64'),
        };
      }
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 从文件加载图片
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_FROM_FILE, async (_, filePath: string) => {
    try {
      const result = await screenshotModule.loadFromFile(filePath);
      if (result.success && result.imageBuffer) {
        return {
          success: true,
          imageData: result.imageBuffer.toString('base64'),
        };
      }
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 验证图片格式
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_VALIDATE, async (_, imageData: string) => {
    try {
      const buffer = Buffer.from(imageData, 'base64');
      const isValid = screenshotModule.validateImage(buffer);
      const format = screenshotModule.getImageFormat(buffer);
      return { success: true, isValid, format };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Screenshot IPC handlers registered');
}

/**
 * 注销截图 IPC 处理器
 */
export function unregisterScreenshotIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.SCREENSHOT_CAPTURE);
  ipcMain.removeHandler(IPC_CHANNELS.SCREENSHOT_FROM_CLIPBOARD);
  ipcMain.removeHandler(IPC_CHANNELS.SCREENSHOT_FROM_FILE);
  ipcMain.removeHandler(IPC_CHANNELS.SCREENSHOT_VALIDATE);
}

export default {
  registerScreenshotIPC,
  unregisterScreenshotIPC,
  IPC_CHANNELS,
};
