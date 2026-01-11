/**
 * Tray Config Storage
 * 托盘配置存储模块
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface TrayConfig {
  showOnStartup: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
}

// 配置文件名
const CONFIG_FILE = 'tray_config.json';

// 默认配置
const DEFAULT_CONFIG: TrayConfig = {
  showOnStartup: true,
  minimizeToTray: true,
  closeToTray: false,  // 关闭时不缩小到托盘，直接关闭
};

// 配置文件路径
let configPath: string | null = null;

/**
 * 获取配置文件路径
 */
function getConfigPath(): string {
  if (!configPath) {
    configPath = path.join(app.getPath('userData'), CONFIG_FILE);
  }
  return configPath;
}

/**
 * 加载配置
 */
export function loadTrayConfig(): TrayConfig {
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const saved = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (error) {
    console.error('Failed to load tray config:', error);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存配置
 */
export function saveTrayConfig(config: TrayConfig): boolean {
  try {
    const filePath = getConfigPath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save tray config:', error);
    return false;
  }
}

/**
 * 更新部分配置
 */
export function updateTrayConfig(updates: Partial<TrayConfig>): TrayConfig {
  const current = loadTrayConfig();
  const updated = { ...current, ...updates };
  saveTrayConfig(updated);
  return updated;
}

/**
 * 获取默认配置
 */
export function getDefaultTrayConfig(): TrayConfig {
  return { ...DEFAULT_CONFIG };
}

export default {
  loadTrayConfig,
  saveTrayConfig,
  updateTrayConfig,
  getDefaultTrayConfig,
};
