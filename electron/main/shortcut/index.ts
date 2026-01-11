/**
 * Global Shortcut Module
 * 全局快捷键模块 - 管理应用的全局快捷键注册和配置
 */

import { globalShortcut } from 'electron';

export interface ShortcutConfig {
  quickEntry: string;
  screenshot: string;
  enabled: boolean;
}

// 默认快捷键配置
const DEFAULT_CONFIG: ShortcutConfig = {
  quickEntry: 'CommandOrControl+Shift+P',
  screenshot: 'CommandOrControl+Shift+O',
  enabled: true,
};

// 当前注册的快捷键
const registeredShortcuts: Map<string, string> = new Map();

// 快捷键回调函数
const shortcutCallbacks: Map<string, () => void> = new Map();

// 当前配置
let currentConfig: ShortcutConfig = { ...DEFAULT_CONFIG };

/**
 * 验证快捷键格式是否有效
 */
export function isValidAccelerator(accelerator: string): boolean {
  if (!accelerator || typeof accelerator !== 'string') {
    return false;
  }

  const parts = accelerator.split('+').map(p => p.trim());
  if (parts.length < 2) {
    return false;
  }

  const modifiers = ['CommandOrControl', 'Control', 'Ctrl', 'Alt', 'Shift', 'Meta', 'Super', 'Command'];
  const validKeys = [
    ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
    ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`), // F1-F12
    ...Array.from({ length: 10 }, (_, i) => String(i)), // 0-9
    'Space', 'Tab', 'Enter', 'Escape', 'Backspace', 'Delete',
    'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown',
  ];

  const lastPart = parts[parts.length - 1];
  const modifierParts = parts.slice(0, -1);

  // 检查是否有至少一个修饰键
  const hasModifier = modifierParts.some(p => modifiers.includes(p));
  if (!hasModifier) {
    return false;
  }

  // 检查所有修饰键是否有效
  const allModifiersValid = modifierParts.every(p => modifiers.includes(p));
  if (!allModifiersValid) {
    return false;
  }

  // 检查最后一个键是否有效
  const isValidKey = validKeys.includes(lastPart) || validKeys.includes(lastPart.toUpperCase());
  return isValidKey;
}

/**
 * 注册快捷键
 */
export function registerShortcut(action: string, accelerator: string, callback: () => void): boolean {
  if (!isValidAccelerator(accelerator)) {
    console.error(`Invalid accelerator format: ${accelerator}`);
    return false;
  }

  // 如果已经注册了相同的 action，先注销
  if (registeredShortcuts.has(action)) {
    unregisterShortcut(action);
  }

  try {
    const success = globalShortcut.register(accelerator, callback);
    if (success) {
      registeredShortcuts.set(action, accelerator);
      shortcutCallbacks.set(action, callback);
      console.log(`Shortcut registered: ${action} -> ${accelerator}`);
      return true;
    } else {
      console.error(`Failed to register shortcut: ${accelerator}`);
      return false;
    }
  } catch (error) {
    console.error(`Error registering shortcut: ${error}`);
    return false;
  }
}

/**
 * 注销快捷键
 */
export function unregisterShortcut(action: string): void {
  const accelerator = registeredShortcuts.get(action);
  if (accelerator) {
    try {
      globalShortcut.unregister(accelerator);
      registeredShortcuts.delete(action);
      shortcutCallbacks.delete(action);
      console.log(`Shortcut unregistered: ${action}`);
    } catch (error) {
      console.error(`Error unregistering shortcut: ${error}`);
    }
  }
}

/**
 * 更新快捷键
 */
export function updateShortcut(action: string, newAccelerator: string, callback?: () => void): boolean {
  const existingCallback = callback || shortcutCallbacks.get(action);
  if (!existingCallback) {
    console.error(`No callback found for action: ${action}`);
    return false;
  }

  unregisterShortcut(action);
  return registerShortcut(action, newAccelerator, existingCallback);
}

/**
 * 获取当前配置
 */
export function getConfig(): ShortcutConfig {
  return { ...currentConfig };
}

/**
 * 设置配置
 */
export function setConfig(config: Partial<ShortcutConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 检查快捷键是否已被注册
 */
export function isAcceleratorRegistered(accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator);
}

/**
 * 清理所有快捷键
 */
export function cleanup(): void {
  for (const action of registeredShortcuts.keys()) {
    unregisterShortcut(action);
  }
  globalShortcut.unregisterAll();
  console.log('All shortcuts cleaned up');
}

/**
 * 初始化快捷键模块
 */
export function initialize(callbacks: { onQuickEntry?: () => void; onScreenshot?: () => void }): void {
  console.log('Initializing shortcuts, config:', currentConfig);
  
  if (!currentConfig.enabled) {
    console.log('Shortcuts are disabled');
    return;
  }

  if (callbacks.onQuickEntry) {
    const success1 = registerShortcut('quickEntry', currentConfig.quickEntry, callbacks.onQuickEntry);
    console.log(`Quick entry shortcut (${currentConfig.quickEntry}) registered:`, success1);
  }

  if (callbacks.onScreenshot) {
    const success2 = registerShortcut('screenshot', currentConfig.screenshot, callbacks.onScreenshot);
    console.log(`Screenshot shortcut (${currentConfig.screenshot}) registered:`, success2);
  }
}

export default {
  initialize,
  registerShortcut,
  unregisterShortcut,
  updateShortcut,
  getConfig,
  setConfig,
  isValidAccelerator,
  isAcceleratorRegistered,
  cleanup,
};
