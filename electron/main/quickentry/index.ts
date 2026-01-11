/**
 * Quick Entry Window Module
 * 快速录入窗口模块 - 管理快速录入弹窗
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';

let quickEntryWindow: BrowserWindow | null = null;

export interface QuickEntryData {
  siteName: string;
  username: string;
  password: string;
  category?: string;
  notes?: string;
}

/**
 * 创建快速录入窗口
 */
export function createQuickEntryWindow(): BrowserWindow {
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) {
    return quickEntryWindow;
  }

  // 获取正确的 preload 路径
  // 从 dist-electron/main/quickentry/index.js 到 dist-electron/preload/index.js
  const preloadPath = path.join(__dirname, '../../preload/index.js');

  quickEntryWindow = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载快速录入页面
  if (process.env.VITE_DEV_SERVER_URL) {
    quickEntryWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/quick-entry`);
  } else {
    // 生产环境：从 dist-electron/main/quickentry 到 dist/index.html
    const htmlPath = path.join(__dirname, '../../../dist/index.html');
    quickEntryWindow.loadFile(htmlPath, { hash: 'quick-entry' });
  }

  // 失去焦点时不自动关闭，保持窗口可见
  quickEntryWindow.on('blur', () => {
    // 可以选择在这里添加一些视觉反馈
  });

  quickEntryWindow.on('closed', () => {
    quickEntryWindow = null;
  });

  return quickEntryWindow;
}

/**
 * 显示快速录入窗口
 */
export function show(position?: { x: number; y: number }): void {
  const win = createQuickEntryWindow();

  if (position) {
    // 使用指定位置
    win.setPosition(position.x, position.y);
  } else {
    // 在鼠标位置附近显示
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = win.getBounds();

    // 确保窗口不会超出屏幕边界
    let x = cursorPoint.x - width / 2;
    let y = cursorPoint.y - height / 2;

    const displayBounds = display.workArea;
    x = Math.max(displayBounds.x, Math.min(x, displayBounds.x + displayBounds.width - width));
    y = Math.max(displayBounds.y, Math.min(y, displayBounds.y + displayBounds.height - height));

    win.setPosition(Math.round(x), Math.round(y));
  }

  win.show();
  win.focus();
}

/**
 * 隐藏快速录入窗口
 */
export function hide(): void {
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) {
    quickEntryWindow.hide();
  }
}

/**
 * 关闭快速录入窗口
 */
export function close(): void {
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) {
    quickEntryWindow.close();
    quickEntryWindow = null;
  }
}

/**
 * 获取当前活动应用名称
 * Windows 平台实现
 */
export async function getActiveAppName(): Promise<string> {
  if (process.platform === 'win32') {
    try {
      // 使用 PowerShell 获取活动窗口标题
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(
        'powershell -command "(Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type -MemberDefinition \'[DllImport(\\"user32.dll\\")]public static extern IntPtr GetForegroundWindow();\' -Name Win32 -Namespace Native -PassThru)::GetForegroundWindow()}).MainWindowTitle"',
        { encoding: 'utf8' }
      );
      
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get active app name:', error);
      return '';
    }
  }
  
  // macOS 和 Linux 暂不支持
  return '';
}

/**
 * 预填充数据
 */
export function prefillData(data: Partial<QuickEntryData>): void {
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) {
    quickEntryWindow.webContents.send('quick-entry:prefill', data);
  }
}

/**
 * 获取窗口实例
 */
export function getWindow(): BrowserWindow | null {
  return quickEntryWindow;
}

/**
 * 检查窗口是否可见
 */
export function isVisible(): boolean {
  return quickEntryWindow !== null && !quickEntryWindow.isDestroyed() && quickEntryWindow.isVisible();
}

export default {
  createQuickEntryWindow,
  show,
  hide,
  close,
  getActiveAppName,
  prefillData,
  getWindow,
  isVisible,
};
