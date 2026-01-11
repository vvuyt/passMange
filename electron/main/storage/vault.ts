/**
 * 密码库管理
 * 处理密码库的初始化、解锁、锁定和主密码修改
 */

import { execute, query, queryOne, saveDatabase, isVaultInitialized } from './db';
import { VaultMeta } from './models';
import {
  generateSalt,
  generateVerificationHash,
  verifyPassword,
  deriveKey,
  setDerivedKey,
  clearDerivedKey,
  encryptWithSessionKey,
  decryptWithSessionKey,
  measureDerivationTime,
} from '../crypto';
import {
  getCryptoConfig,
  saveCryptoConfig,
  initCryptoConfig,
  getIterations,
  needsUpgrade,
  getSecurityInfo,
  DEFAULT_ITERATIONS,
  type CryptoConfig,
  type SecurityInfo,
} from '../crypto/config';

/**
 * 初始化密码库（首次设置主密码）
 */
export function setupVault(masterPassword: string): void {
  if (isVaultInitialized()) {
    throw new Error('Vault is already initialized');
  }

  // 初始化加密配置
  initCryptoConfig();
  
  const iterations = getIterations();
  const salt = generateSalt();
  const verificationHash = generateVerificationHash(masterPassword, salt, iterations);
  const now = new Date().toISOString();

  execute(
    `INSERT INTO vault_meta (id, salt, verification_hash, totp_enabled, created_at, updated_at, version)
     VALUES (1, ?, ?, 0, ?, ?, 1)`,
    [salt, verificationHash, now, now]
  );

  // 派生密钥并保存到内存
  const key = deriveKey(masterPassword, salt, iterations);
  setDerivedKey(key, iterations);
}

/**
 * 解锁密码库
 */
export function unlockVault(masterPassword: string): boolean {
  const meta = getVaultMeta();
  if (!meta) {
    throw new Error('Vault is not initialized');
  }

  const iterations = getIterations();
  
  // 验证主密码
  if (verifyPassword(masterPassword, meta.salt, meta.verificationHash, iterations)) {
    // 派生密钥并保存到内存
    const key = deriveKey(masterPassword, meta.salt, iterations);
    setDerivedKey(key, iterations);
    return true;
  }

  // 兼容处理：之前的 bug 导致升级后 version 没更新
  // 如果当前 version=1 但用 100000 次迭代验证失败，尝试用 600000 次迭代验证
  if (meta.version === 1) {
    if (verifyPassword(masterPassword, meta.salt, meta.verificationHash, DEFAULT_ITERATIONS)) {
      // 验证成功，说明是 bug 导致的 version 不一致，修复它
      execute(
        'UPDATE vault_meta SET version = 2, updated_at = ? WHERE id = 1',
        [new Date().toISOString()]
      );
      
      // 派生密钥并保存到内存
      const key = deriveKey(masterPassword, meta.salt, DEFAULT_ITERATIONS);
      setDerivedKey(key, DEFAULT_ITERATIONS);
      return true;
    }
  }

  return false;
}

/**
 * 锁定密码库
 */
export function lockVault(): void {
  clearDerivedKey();
}


/**
 * 修改主密码
 */
export function changeMasterPassword(oldPassword: string, newPassword: string): void {
  const meta = getVaultMeta();
  if (!meta) {
    throw new Error('Vault is not initialized');
  }

  const iterations = getIterations();

  // 验证旧密码
  if (!verifyPassword(oldPassword, meta.salt, meta.verificationHash, iterations)) {
    throw new Error('Invalid current password');
  }

  // 生成新的盐值和验证哈希
  const newSalt = generateSalt();
  const newVerificationHash = generateVerificationHash(newPassword, newSalt, iterations);
  const now = new Date().toISOString();

  // 获取旧密钥
  const oldKey = deriveKey(oldPassword, meta.salt, iterations);
  setDerivedKey(oldKey, iterations);

  // 重新加密所有密码条目
  const entries = query<{ id: string; encrypted_data: string }>(
    'SELECT id, encrypted_data FROM password_entries'
  );

  // 派生新密钥
  const newKey = deriveKey(newPassword, newSalt, iterations);

  for (const entry of entries) {
    // 用旧密钥解密
    const encryptedData = JSON.parse(entry.encrypted_data);
    const decrypted = decryptWithSessionKey(encryptedData);

    // 切换到新密钥
    setDerivedKey(newKey, iterations);

    // 用新密钥加密
    const newEncrypted = encryptWithSessionKey(decrypted);

    // 更新数据库
    execute(
      'UPDATE password_entries SET encrypted_data = ? WHERE id = ?',
      [JSON.stringify(newEncrypted), entry.id]
    );

    // 切回旧密钥继续处理下一条
    setDerivedKey(oldKey, iterations);
  }

  // 更新密码库元数据
  execute(
    `UPDATE vault_meta SET salt = ?, verification_hash = ?, updated_at = ? WHERE id = 1`,
    [newSalt, newVerificationHash, now]
  );

  // 设置新密钥
  setDerivedKey(newKey, iterations);
}

/**
 * 获取密码库元数据
 */
export function getVaultMeta(): VaultMeta | null {
  const row = queryOne<{
    salt: string;
    verification_hash: string;
    totp_enabled: number;
    totp_secret_encrypted: string | null;
    recovery_codes_encrypted: string | null;
    created_at: string;
    updated_at: string;
    version: number;
  }>('SELECT * FROM vault_meta WHERE id = 1');

  if (!row) return null;

  return {
    salt: row.salt,
    verificationHash: row.verification_hash,
    totpEnabled: row.totp_enabled === 1,
    totpSecretEncrypted: row.totp_secret_encrypted || undefined,
    recoveryCodesEncrypted: row.recovery_codes_encrypted || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

/**
 * 更新 TOTP 设置
 */
export function updateTotpSettings(
  enabled: boolean,
  secretEncrypted?: string,
  recoveryCodesEncrypted?: string
): void {
  const now = new Date().toISOString();
  execute(
    `UPDATE vault_meta 
     SET totp_enabled = ?, totp_secret_encrypted = ?, recovery_codes_encrypted = ?, updated_at = ?
     WHERE id = 1`,
    [enabled ? 1 : 0, secretEncrypted || null, recoveryCodesEncrypted || null, now]
  );
}


/**
 * 验证主密码是否正确
 */
export function verifyMasterPassword(password: string): boolean {
  const meta = getVaultMeta();
  if (!meta) {
    return false;
  }
  const iterations = getIterations();
  return verifyPassword(password, meta.salt, meta.verificationHash, iterations);
}

/**
 * 获取安全信息
 */
export function getVaultSecurityInfo(): SecurityInfo & { derivationTimeMs: number } {
  const info = getSecurityInfo();
  const derivationTimeMs = measureDerivationTime(info.iterations);
  return { ...info, derivationTimeMs };
}

/**
 * 检查是否需要升级安全参数
 */
export function checkSecurityUpgrade(): boolean {
  return needsUpgrade();
}

/**
 * 升级安全参数（增加迭代次数）
 */
export function upgradeSecurityParams(masterPassword: string, newIterations: number = DEFAULT_ITERATIONS): void {
  const meta = getVaultMeta();
  if (!meta) {
    throw new Error('Vault is not initialized');
  }

  const oldIterations = getIterations();

  // 验证主密码（使用旧迭代次数）
  if (!verifyPassword(masterPassword, meta.salt, meta.verificationHash, oldIterations)) {
    throw new Error('主密码错误');
  }

  // 生成新的盐值和验证哈希（使用新迭代次数）
  const newSalt = generateSalt();
  const newVerificationHash = generateVerificationHash(masterPassword, newSalt, newIterations);
  const now = new Date().toISOString();

  // 获取旧密钥
  const oldKey = deriveKey(masterPassword, meta.salt, oldIterations);
  setDerivedKey(oldKey, oldIterations);

  // 重新加密所有密码条目
  const entries = query<{ id: string; encrypted_data: string }>(
    'SELECT id, encrypted_data FROM password_entries'
  );

  // 派生新密钥
  const newKey = deriveKey(masterPassword, newSalt, newIterations);

  for (const entry of entries) {
    // 用旧密钥解密
    const encryptedData = JSON.parse(entry.encrypted_data);
    const decrypted = decryptWithSessionKey(encryptedData);

    // 切换到新密钥
    setDerivedKey(newKey, newIterations);

    // 用新密钥加密
    const newEncrypted = encryptWithSessionKey(decrypted);

    // 更新数据库
    execute(
      'UPDATE password_entries SET encrypted_data = ? WHERE id = ?',
      [JSON.stringify(newEncrypted), entry.id]
    );

    // 切回旧密钥继续处理下一条
    setDerivedKey(oldKey, oldIterations);
  }

  // 更新密码库元数据（包括 version 字段，这是关键！）
  execute(
    `UPDATE vault_meta SET salt = ?, verification_hash = ?, version = 2, updated_at = ? WHERE id = 1`,
    [newSalt, newVerificationHash, now]
  );

  // 设置新密钥
  setDerivedKey(newKey, newIterations);
}

/**
 * 销毁密码库（删除所有数据）
 * 返回备份文件路径
 */
export async function destroyVault(masterPassword: string): Promise<string> {
  // 验证主密码
  if (!verifyMasterPassword(masterPassword)) {
    throw new Error('主密码错误');
  }

  // 先创建备份
  const { createBackup } = require('../backup');
  const backup = await createBackup('manual');
  const backupPath = backup.filePath || backup.path;

  // 清除所有数据
  execute('DELETE FROM entry_tags');
  execute('DELETE FROM password_entries');
  execute('DELETE FROM categories WHERE is_default = 0');
  execute('DELETE FROM tags');
  execute('DELETE FROM backups');
  
  // 重置 vault_meta（保留结构但清除 TOTP）
  execute(`
    UPDATE vault_meta 
    SET totp_enabled = 0, 
        totp_secret_encrypted = NULL, 
        recovery_codes_encrypted = NULL,
        updated_at = ?
    WHERE id = 1
  `, [new Date().toISOString()]);

  // 保存数据库
  saveDatabase();

  // 锁定密码库
  clearDerivedKey();

  return backupPath;
}

/**
 * 完全重置密码库（不需要密码验证，用于忘记密码的情况）
 * 删除所有数据，允许重新设置主密码
 */
export function resetVault(): void {
  // 清除所有数据
  execute('DELETE FROM entry_tags');
  execute('DELETE FROM password_entries');
  execute('DELETE FROM categories WHERE is_default = 0');
  execute('DELETE FROM tags');
  execute('DELETE FROM backups');
  execute('DELETE FROM vault_meta');

  // 保存数据库
  saveDatabase();

  // 锁定密码库
  clearDerivedKey();
}
