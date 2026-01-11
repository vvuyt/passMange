/**
 * Tray Icon Module
 * 系统托盘模块 - 管理系统托盘图标和菜单
 */

import { Tray, Menu, nativeImage, app, BrowserWindow, Notification } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

export interface TrayCallbacks {
  onQuickEntry: () => void;
  onScreenshot: () => void;
  onOpenMainWindow: () => void;
  onSettings: () => void;
  onExit: () => void;
}

let callbacks: TrayCallbacks | null = null;

/**
 * 创建托盘图标
 */
export function createTray(win: BrowserWindow, trayCallbacks: TrayCallbacks): Tray {
  mainWindow = win;
  callbacks = trayCallbacks;

  // 创建托盘图标
  const iconPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), 'build/icon.png')
    : path.join(__dirname, '../../../build/icon.png');

  // 尝试加载图标，如果失败则使用空图标
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // 创建一个简单的默认图标
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('密码管理器');

  // 创建上下文菜单
  updateMenu();

  // 双击打开主窗口
  tray.on('double-click', () => {
    callbacks?.onOpenMainWindow();
  });

  return tray;
}

/**
 * 更新托盘菜单
 */
export function updateMenu(): void {
  if (!tray || !callbacks) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '快速录入',
      accelerator: 'CommandOrControl+Shift+P',
      click: () => callbacks?.onQuickEntry(),
    },
    {
      label: '截图识别',
      accelerator: 'CommandOrControl+Shift+O',
      click: () => callbacks?.onScreenshot(),
    },
    { type: 'separator' },
    {
      label: '打开主窗口',
      click: () => callbacks?.onOpenMainWindow(),
    },
    {
      label: '设置',
      click: () => callbacks?.onSettings(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => callbacks?.onExit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * 显示通知
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: true,
    });
    notification.show();
  }
}

/**
 * 销毁托盘
 */
export function destroy(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * 获取托盘实例
 */
export function getTray(): Tray | null {
  return tray;
}

export default {
  createTray,
  updateMenu,
  showNotification,
  destroy,
  getTray,
};
