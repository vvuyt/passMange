/**
 * Shortcut Config Storage
 * 快捷键配置存储模块
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { ShortcutConfig } from './index';

// 配置文件名
const CONFIG_FILE = 'shortcut_config.json';

// 默认配置
const DEFAULT_CONFIG: ShortcutConfig = {
  quickEntry: 'CommandOrControl+Shift+P',
  screenshot: 'CommandOrControl+Shift+O',
  enabled: true,
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
export function loadShortcutConfig(): ShortcutConfig {
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const saved = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (error) {
    console.error('Failed to load shortcut config:', error);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存配置
 */
export function saveShortcutConfig(config: ShortcutConfig): boolean {
  try {
    const filePath = getConfigPath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save shortcut config:', error);
    return false;
  }
}

/**
 * 更新部分配置
 */
export function updateShortcutConfig(updates: Partial<ShortcutConfig>): ShortcutConfig {
  const current = loadShortcutConfig();
  const updated = { ...current, ...updates };
  saveShortcutConfig(updated);
  return updated;
}

/**
 * 重置为默认配置
 */
export function resetShortcutConfig(): ShortcutConfig {
  saveShortcutConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): ShortcutConfig {
  return { ...DEFAULT_CONFIG };
}

export default {
  loadShortcutConfig,
  saveShortcutConfig,
  updateShortcutConfig,
  resetShortcutConfig,
  getDefaultConfig,
};
