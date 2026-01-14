/**
 * TOTP 二次验证服务
 */

import * as OTPAuth from 'otpauth';
import { randomBytes, encryptObject, decryptObject, getDerivedKey } from '../utils/crypto';
import { execute, queryOne } from './database';
import { EncryptedData } from '../types/models';

// TOTP 配置
const TOTP_CONFIG = {
  issuer: '密码管理器',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
};

/**
 * 生成 TOTP 密钥
 */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  // 转换为 Uint8Array 再创建 Secret
  const uint8Array = new Uint8Array(bytes);
  const secret = new OTPAuth.Secret({ buffer: uint8Array.buffer });
  return secret.base32;
}

/**
 * 生成恢复码
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(4);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * 生成 TOTP URI（用于生成二维码）
 */
export function generateTotpUri(secret: string, accountName: string = '密码库'): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    label: accountName,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/**
 * 验证 TOTP 码
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // 允许前后各一个时间窗口的误差
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * 生成当前 TOTP 码（用于测试）
 */
export function generateCurrentCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.generate();
}

/**
 * 设置 TOTP 数据
 */
interface TotpSetupData {
  secret: string;
  uri: string;
  recoveryCodes: string[];
}

/**
 * 初始化 TOTP 设置（生成密钥和恢复码，但不启用）
 */
export function initTotpSetup(): TotpSetupData {
  const secret = generateTotpSecret();
  const uri = generateTotpUri(secret);
  const recoveryCodes = generateRecoveryCodes();

  return { secret, uri, recoveryCodes };
}

/**
 * 启用 TOTP
 */
export async function enableTotp(secret: string, recoveryCodes: string[]): Promise<void> {
  const key = getDerivedKey();
  
  // 加密存储
  const encryptedSecret = encryptObject({ secret }, key);
  const encryptedCodes = encryptObject({ codes: recoveryCodes }, key);
  const now = new Date().toISOString();

  await execute(
    `UPDATE vault_meta SET 
      totp_enabled = 1, 
      totp_secret_encrypted = ?, 
      recovery_codes_encrypted = ?,
      updated_at = ?
    WHERE id = 1`,
    [JSON.stringify(encryptedSecret), JSON.stringify(encryptedCodes), now]
  );
}

/**
 * 禁用 TOTP
 */
export async function disableTotp(): Promise<void> {
  const now = new Date().toISOString();
  await execute(
    `UPDATE vault_meta SET 
      totp_enabled = 0, 
      totp_secret_encrypted = NULL, 
      recovery_codes_encrypted = NULL,
      updated_at = ?
    WHERE id = 1`,
    [now]
  );
}

/**
 * 检查是否启用了 TOTP
 */
export async function isTotpEnabled(): Promise<boolean> {
  const meta = await queryOne<{ totp_enabled: number }>(
    'SELECT totp_enabled FROM vault_meta WHERE id = 1'
  );
  return meta?.totp_enabled === 1;
}

/**
 * 获取 TOTP 密钥（已解密）
 */
async function getTotpSecret(): Promise<string | null> {
  const meta = await queryOne<{ totp_secret_encrypted: string | null }>(
    'SELECT totp_secret_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.totp_secret_encrypted) return null;

  try {
    const key = getDerivedKey();
    const encrypted: EncryptedData = JSON.parse(meta.totp_secret_encrypted);
    const decrypted = decryptObject<{ secret: string }>(encrypted, key);
    return decrypted.secret;
  } catch {
    return null;
  }
}

/**
 * 验证 TOTP 码（使用存储的密钥）
 */
export async function verifyTotp(code: string): Promise<boolean> {
  const secret = await getTotpSecret();
  if (!secret) return false;
  return verifyTotpCode(secret, code);
}

/**
 * 验证恢复码
 */
export async function verifyRecoveryCode(code: string): Promise<boolean> {
  const meta = await queryOne<{ recovery_codes_encrypted: string | null }>(
    'SELECT recovery_codes_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.recovery_codes_encrypted) return false;

  try {
    const key = getDerivedKey();
    const encrypted: EncryptedData = JSON.parse(meta.recovery_codes_encrypted);
    const decrypted = decryptObject<{ codes: string[] }>(encrypted, key);
    
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const index = decrypted.codes.findIndex(c => 
      c.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedCode
    );

    if (index === -1) return false;

    // 使用后删除该恢复码
    decrypted.codes.splice(index, 1);
    const newEncrypted = encryptObject({ codes: decrypted.codes }, key);
    
    await execute(
      'UPDATE vault_meta SET recovery_codes_encrypted = ?, updated_at = ? WHERE id = 1',
      [JSON.stringify(newEncrypted), new Date().toISOString()]
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * 获取剩余恢复码数量
 */
export async function getRemainingRecoveryCodesCount(): Promise<number> {
  const meta = await queryOne<{ recovery_codes_encrypted: string | null }>(
    'SELECT recovery_codes_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.recovery_codes_encrypted) return 0;

  try {
    const key = getDerivedKey();
    const encrypted: EncryptedData = JSON.parse(meta.recovery_codes_encrypted);
    const decrypted = decryptObject<{ codes: string[] }>(encrypted, key);
    return decrypted.codes.length;
  } catch {
    return 0;
  }
}
