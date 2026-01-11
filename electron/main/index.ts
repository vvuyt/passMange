import { app, BrowserWindow, powerMonitor, ipcMain, dialog } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc';
import { lockVault } from './storage/vault';
import { isUnlocked } from './crypto';
import { getSyncManager } from './sync/sync-manager';

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// 自动锁定配置
let autoLockTimeout = 5 * 60 * 1000; // 默认5分钟
let idleTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();

/**
 * 重置空闲计时器
 */
function resetIdleTimer() {
  lastActivityTime = Date.now();
  
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  
  if (autoLockTimeout > 0 && isUnlocked()) {
    idleTimer = setTimeout(() => {
      triggerAutoLock();
    }, autoLockTimeout);
  }
}

/**
 * 触发自动锁定
 */
function triggerAutoLock() {
  if (isUnlocked()) {
    lockVault();
    // 通知渲染进程
    mainWindow?.webContents.send('vault-locked');
  }
}

/**
 * 设置自动锁定超时时间
 */
function setAutoLockTimeout(minutes: number) {
  autoLockTimeout = minutes * 60 * 1000;
  resetIdleTimer();
}

/**
 * 初始化空闲检测
 */
function initIdleDetection() {
  // 监听系统空闲状态
  powerMonitor.on('lock-screen', () => {
    // 系统锁屏时自动锁定密码库
    triggerAutoLock();
  });

  powerMonitor.on('suspend', () => {
    // 系统休眠时自动锁定
    triggerAutoLock();
  });

  // 注册 IPC 处理器
  ipcMain.handle('set-auto-lock-timeout', (_event, minutes: number) => {
    setAutoLockTimeout(minutes);
    return { success: true };
  });

  ipcMain.handle('get-auto-lock-timeout', () => {
    return autoLockTimeout / 60000; // 返回分钟数
  });

  ipcMain.handle('reset-idle-timer', () => {
    resetIdleTimer();
    return { success: true };
  });

  // 窗口控制
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  ipcMain.handle('window-set-always-on-top', (_event, flag: boolean) => {
    mainWindow?.setAlwaysOnTop(flag);
    return mainWindow?.isAlwaysOnTop() || false;
  });

  ipcMain.handle('window-is-always-on-top', () => {
    return mainWindow?.isAlwaysOnTop() || false;
  });

  // 初始化计时器
  resetIdleTimer();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false, // 无边框窗口
    titleBarStyle: 'hidden',
    show: false,
  });

  // 窗口准备好后显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 退出前检查未同步更改
  mainWindow.on('close', async (e) => {
    if (isQuitting) return;
    
    try {
      const syncManager = getSyncManager();
      const config = syncManager.getConfig();
      
      // 检查是否启用退出提醒且有未同步更改
      if (config.remindOnExit && syncManager.hasUnsyncedChanges()) {
        e.preventDefault();
        
        const result = await dialog.showMessageBox(mainWindow!, {
          type: 'question',
          buttons: ['同步后退出', '直接退出', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: '未同步的更改',
          message: '您有未同步到云端的更改',
          detail: '是否在退出前同步数据？',
        });
        
        if (result.response === 0) {
          // 同步后退出
          try {
            const uploadResult = await syncManager.uploadToCloud();
            if (uploadResult.success) {
              isQuitting = true;
              mainWindow?.close();
            } else {
              await dialog.showMessageBox(mainWindow!, {
                type: 'error',
                title: '同步失败',
                message: uploadResult.error || '同步失败，请稍后重试',
              });
            }
          } catch (err) {
            await dialog.showMessageBox(mainWindow!, {
              type: 'error',
              title: '同步失败',
              message: (err as Error).message,
            });
          }
        } else if (result.response === 1) {
          // 直接退出
          isQuitting = true;
          mainWindow?.close();
        }
        // 取消则不做任何操作
      }
    } catch {
      // 同步模块未初始化，直接退出
    }
  });
}

// 应用准备就绪
app.whenReady().then(async () => {
  // 注册 IPC 处理器
  await registerIpcHandlers();
  
  // 初始化空闲检测
  initIdleDetection();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 导出 mainWindow 供其他模块使用
export { mainWindow };

// 导出自动锁定相关函数
export { setAutoLockTimeout, resetIdleTimer };
