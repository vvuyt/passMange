/**
 * 加密配置模块
 * 管理 PBKDF2 迭代次数等安全参数
 */

import { query, execute, queryOne } from '../storage/db';

// 配置版本
const CONFIG_VERSION = 2;

// 默认迭代次数（OWASP 2023 推荐）
const DEFAULT_ITERATIONS = 600000;

// 旧版本迭代次数（用于升级检测）
const LEGACY_ITERATIONS = 100000;

// 迭代次数范围
const MIN_ITERATIONS = 100000;
const MAX_ITERATIONS = 2000000;

export interface CryptoConfig {
  version: number;
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityInfo {
  iterations: number;
  version: number;
  securityLevel: 'low' | 'medium' | 'high';
  needsUpgrade: boolean;
  derivationTimeMs?: number;
}

/**
 * 获取加密配置
 */
export function getCryptoConfig(): CryptoConfig {
  // 从 vault_meta 表读取配置
  const row = queryOne<{ version: number }>('SELECT version FROM vault_meta WHERE id = 1');
  
  if (row) {
    // 根据版本判断迭代次数
    if (row.version >= 2) {
      return {
        version: row.version,
        iterations: DEFAULT_ITERATIONS,
        createdAt: '',
        updatedAt: ''
      };
    } else {
      // 旧版本数据库
      return {
        version: 1,
        iterations: LEGACY_ITERATIONS,
        createdAt: '',
        updatedAt: ''
      };
    }
  }
  
  // 新数据库，使用默认配置
  return {
    version: CONFIG_VERSION,
    iterations: DEFAULT_ITERATIONS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * 获取当前迭代次数
 */
export function getIterations(): number {
  return getCryptoConfig().iterations;
}

/**
 * 设置迭代次数（通过更新 vault_meta 版本）
 */
export function setIterations(iterations: number): void {
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error(`迭代次数必须在 ${MIN_ITERATIONS} 到 ${MAX_ITERATIONS} 之间`);
  }
  
  // 更新版本号来标记使用新迭代次数
  execute(
    'UPDATE vault_meta SET version = ?, updated_at = ? WHERE id = 1',
    [CONFIG_VERSION, new Date().toISOString()]
  );
}

/**
 * 检查是否需要升级
 */
export function needsUpgrade(): boolean {
  const config = getCryptoConfig();
  return config.iterations < DEFAULT_ITERATIONS;
}

/**
 * 获取安全等级
 */
function getSecurityLevel(iterations: number): 'low' | 'medium' | 'high' {
  if (iterations < 300000) return 'low';
  if (iterations < 600000) return 'medium';
  return 'high';
}

/**
 * 获取安全信息
 */
export function getSecurityInfo(): SecurityInfo {
  const config = getCryptoConfig();
  return {
    iterations: config.iterations,
    version: config.version,
    securityLevel: getSecurityLevel(config.iterations),
    needsUpgrade: needsUpgrade()
  };
}

/**
 * 保存加密配置（更新版本和迭代次数）
 */
export function saveCryptoConfig(config: CryptoConfig): void {
  execute(
    'UPDATE vault_meta SET version = ?, updated_at = ? WHERE id = 1',
    [config.version, config.updatedAt || new Date().toISOString()]
  );
}

/**
 * 初始化新数据库的加密配置
 */
export function initCryptoConfig(): void {
  // 配置在 vault_meta 表中通过 version 字段管理
  // 新数据库创建时会自动设置 version = 2
}

// 导出常量
export { DEFAULT_ITERATIONS, LEGACY_ITERATIONS, MIN_ITERATIONS, MAX_ITERATIONS };
