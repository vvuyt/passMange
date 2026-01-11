/**
 * 加密模块实现
 * 使用 Node.js crypto 模块实现 AES-256-GCM 加密和 PBKDF2 密钥派生
 */

import crypto from 'crypto';
import { EncryptedData } from '../storage/models';
import { getIterations, DEFAULT_ITERATIONS } from './config';

// 加密配置常量
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const NONCE_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_DIGEST = 'sha256';

// 内存中的派生密钥（解锁后保存）
let derivedKey: Buffer | null = null;
// 当前会话使用的迭代次数
let currentIterations: number | null = null;

/**
 * 生成随机盐值
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * 使用 PBKDF2 从主密码派生密钥
 * @param password 主密码
 * @param salt 盐值
 * @param iterations 迭代次数（可选，默认从配置读取）
 */
export function deriveKey(password: string, salt: string, iterations?: number): Buffer {
  const saltBuffer = Buffer.from(salt, 'base64');
  const iter = iterations ?? getIterationsForDerivation();
  return crypto.pbkdf2Sync(
    password,
    saltBuffer,
    iter,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
}

/**
 * 获取用于密钥派生的迭代次数
 */
function getIterationsForDerivation(): number {
  try {
    return getIterations();
  } catch {
    // 数据库未初始化时使用默认值
    return DEFAULT_ITERATIONS;
  }
}

/**
 * 测量密钥派生耗时
 * @param iterations 迭代次数
 * @returns 耗时（毫秒）
 */
export function measureDerivationTime(iterations: number): number {
  const testPassword = 'test_password_for_timing';
  const testSalt = generateSalt();
  
  const start = performance.now();
  deriveKey(testPassword, testSalt, iterations);
  const end = performance.now();
  
  return Math.round(end - start);
}

/**
 * 生成验证哈希（用于验证主密码是否正确）
 * 使用双重哈希：先派生密钥，再对密钥进行哈希
 * @param password 主密码
 * @param salt 盐值
 * @param iterations 迭代次数（可选）
 */
export function generateVerificationHash(password: string, salt: string, iterations?: number): string {
  const key = deriveKey(password, salt, iterations);
  return crypto.createHash('sha256').update(key).digest('base64');
}

/**
 * 验证主密码
 * @param password 主密码
 * @param salt 盐值
 * @param storedHash 存储的哈希
 * @param iterations 迭代次数（可选）
 */
export function verifyPassword(password: string, salt: string, storedHash: string, iterations?: number): boolean {
  const hash = generateVerificationHash(password, salt, iterations);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'base64'),
    Buffer.from(storedHash, 'base64')
  );
}


/**
 * 使用 AES-256-GCM 加密数据
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    nonce: nonce.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * 使用 AES-256-GCM 解密数据
 */
export function decrypt(encryptedData: EncryptedData, key: Buffer): string {
  const nonce = Buffer.from(encryptedData.nonce, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * 加密 JSON 对象
 */
export function encryptObject<T>(obj: T, key: Buffer): EncryptedData {
  const json = JSON.stringify(obj);
  return encrypt(json, key);
}

/**
 * 解密为 JSON 对象
 */
export function decryptObject<T>(encryptedData: EncryptedData, key: Buffer): T {
  const json = decrypt(encryptedData, key);
  return JSON.parse(json) as T;
}


/**
 * 设置当前会话的派生密钥（解锁密码库时调用）
 * @param key 派生密钥
 * @param iterations 使用的迭代次数（可选）
 */
export function setDerivedKey(key: Buffer, iterations?: number): void {
  derivedKey = key;
  currentIterations = iterations ?? null;
}

/**
 * 获取当前会话的派生密钥
 */
export function getDerivedKey(): Buffer {
  if (!derivedKey) {
    throw new Error('Vault is locked. Please unlock first.');
  }
  return derivedKey;
}

/**
 * 获取当前会话使用的迭代次数
 */
export function getCurrentIterations(): number | null {
  return currentIterations;
}

/**
 * 清除派生密钥（锁定密码库时调用）
 */
export function clearDerivedKey(): void {
  if (derivedKey) {
    // 安全清除内存中的密钥
    derivedKey.fill(0);
    derivedKey = null;
  }
  currentIterations = null;
}

/**
 * 检查密码库是否已解锁
 */
export function isUnlocked(): boolean {
  return derivedKey !== null;
}

/**
 * 使用当前会话密钥加密
 */
export function encryptWithSessionKey(plaintext: string): EncryptedData {
  return encrypt(plaintext, getDerivedKey());
}

/**
 * 使用当前会话密钥解密
 */
export function decryptWithSessionKey(encryptedData: EncryptedData): string {
  return decrypt(encryptedData, getDerivedKey());
}

/**
 * 使用当前会话密钥加密对象
 */
export function encryptObjectWithSessionKey<T>(obj: T): EncryptedData {
  return encryptObject(obj, getDerivedKey());
}

/**
 * 使用当前会话密钥解密对象
 */
export function decryptObjectWithSessionKey<T>(encryptedData: EncryptedData): T {
  return decryptObject<T>(encryptedData, getDerivedKey());
}

/**
 * 生成随机字节（用于其他模块）
 */
export function randomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * 计算 SHA-256 哈希
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('base64');
}
