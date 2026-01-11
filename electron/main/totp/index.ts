/**
 * TOTP 二次验证模块
 */

import * as OTPAuth from 'otpauth';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { execute, queryOne } from '../storage/db';
import { encryptWithSessionKey, decryptWithSessionKey } from '../crypto';

// TOTP 配置
const TOTP_CONFIG = {
  issuer: '密码管理器',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
};

// 恢复码数量
const RECOVERY_CODE_COUNT = 8;

/**
 * 生成 TOTP 密钥
 */
function generateSecret(): string {
  // 生成 20 字节的随机密钥并转换为 Base32
  const buffer = crypto.randomBytes(20);
  // 手动转换为 Base32
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += base32Chars[(value << (5 - bits)) & 31];
  }
  
  return result;
}

/**
 * 生成恢复码
 */
function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // 生成 8 位随机恢复码
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * 创建 TOTP 实例
 */
function createTOTP(secret: string, label: string = 'user'): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    label,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * 设置 TOTP
 * 返回密钥、二维码和恢复码
 */
export async function setupTotp(): Promise<{
  secret: string;
  qrCodeBase64: string;
  recoveryCodes: string[];
}> {
  // 生成密钥
  const secret = generateSecret();
  
  // 创建 TOTP 实例
  const totp = createTOTP(secret);
  
  // 生成二维码
  const otpauthUrl = totp.toString();
  const qrCodeBase64 = await QRCode.toDataURL(otpauthUrl, {
    width: 200,
    margin: 2,
  });
  
  // 生成恢复码
  const recoveryCodes = generateRecoveryCodes();
  
  return {
    secret,
    qrCodeBase64,
    recoveryCodes,
  };
}

/**
 * 启用 TOTP
 * 在用户验证成功后调用
 */
export function enableTotp(secret: string, recoveryCodes: string[]): void {
  // 加密存储密钥和恢复码
  const encryptedSecret = encryptWithSessionKey(secret);
  const encryptedCodes = encryptWithSessionKey(JSON.stringify(recoveryCodes));
  
  execute(
    `UPDATE vault_meta SET 
      totp_enabled = 1,
      totp_secret_encrypted = ?,
      recovery_codes_encrypted = ?,
      updated_at = ?
     WHERE id = 1`,
    [JSON.stringify(encryptedSecret), JSON.stringify(encryptedCodes), new Date().toISOString()]
  );
}

/**
 * 禁用 TOTP
 */
export function disableTotp(): void {
  execute(
    `UPDATE vault_meta SET 
      totp_enabled = 0,
      totp_secret_encrypted = NULL,
      recovery_codes_encrypted = NULL,
      updated_at = ?
     WHERE id = 1`,
    [new Date().toISOString()]
  );
}

/**
 * 检查 TOTP 是否启用
 */
export function isTotpEnabled(): boolean {
  const meta = queryOne<{ totp_enabled: number }>(
    'SELECT totp_enabled FROM vault_meta WHERE id = 1'
  );
  return meta?.totp_enabled === 1;
}

/**
 * 验证 TOTP 验证码
 */
export function verifyTotp(code: string): boolean {
  if (!isTotpEnabled()) {
    return true; // TOTP 未启用，直接通过
  }
  
  // 获取加密的密钥
  const meta = queryOne<{ totp_secret_encrypted: string }>(
    'SELECT totp_secret_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.totp_secret_encrypted) {
    return false;
  }
  
  try {
    // 解密密钥
    const encryptedData = JSON.parse(meta.totp_secret_encrypted);
    const secret = decryptWithSessionKey(encryptedData);
    
    // 创建 TOTP 实例并验证
    const totp = createTOTP(secret);
    
    // 验证码，允许前后一个时间窗口的容差
    const delta = totp.validate({ token: code, window: 1 });
    
    return delta !== null;
  } catch {
    return false;
  }
}

/**
 * 验证恢复码
 */
export function verifyRecoveryCode(code: string): boolean {
  if (!isTotpEnabled()) {
    return false;
  }
  
  // 获取加密的恢复码
  const meta = queryOne<{ recovery_codes_encrypted: string }>(
    'SELECT recovery_codes_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.recovery_codes_encrypted) {
    return false;
  }
  
  try {
    // 解密恢复码
    const encryptedData = JSON.parse(meta.recovery_codes_encrypted);
    const codesJson = decryptWithSessionKey(encryptedData);
    const codes: string[] = JSON.parse(codesJson);
    
    // 标准化输入的恢复码
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;
    
    // 查找匹配的恢复码
    const index = codes.findIndex(c => c === formattedCode);
    
    if (index === -1) {
      return false;
    }
    
    // 移除已使用的恢复码
    codes.splice(index, 1);
    
    // 更新存储
    const newEncryptedCodes = encryptWithSessionKey(JSON.stringify(codes));
    execute(
      `UPDATE vault_meta SET recovery_codes_encrypted = ?, updated_at = ? WHERE id = 1`,
      [JSON.stringify(newEncryptedCodes), new Date().toISOString()]
    );
    
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取剩余恢复码数量
 */
export function getRemainingRecoveryCodesCount(): number {
  if (!isTotpEnabled()) {
    return 0;
  }
  
  const meta = queryOne<{ recovery_codes_encrypted: string }>(
    'SELECT recovery_codes_encrypted FROM vault_meta WHERE id = 1'
  );
  
  if (!meta?.recovery_codes_encrypted) {
    return 0;
  }
  
  try {
    const encryptedData = JSON.parse(meta.recovery_codes_encrypted);
    const codesJson = decryptWithSessionKey(encryptedData);
    const codes: string[] = JSON.parse(codesJson);
    return codes.length;
  } catch {
    return 0;
  }
}

/**
 * 重新生成恢复码
 */
export function regenerateRecoveryCodes(): string[] {
  if (!isTotpEnabled()) {
    throw new Error('TOTP 未启用');
  }
  
  const newCodes = generateRecoveryCodes();
  const encryptedCodes = encryptWithSessionKey(JSON.stringify(newCodes));
  
  execute(
    `UPDATE vault_meta SET recovery_codes_encrypted = ?, updated_at = ? WHERE id = 1`,
    [JSON.stringify(encryptedCodes), new Date().toISOString()]
  );
  
  return newCodes;
}
