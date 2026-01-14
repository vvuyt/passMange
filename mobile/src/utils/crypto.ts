/**
 * 加密模块 - React Native 版本
 * 使用 react-native-quick-crypto 实现 AES-256-GCM 加密和 PBKDF2 密钥派生
 */

import Crypto from 'react-native-quick-crypto';
import { EncryptedData } from '../types/models';

// 加密配置常量
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const NONCE_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_DIGEST = 'sha256';
const DEFAULT_ITERATIONS = 600000;

// 内存中的派生密钥
let derivedKey: Buffer | null = null;
let currentIterations: number | null = null;

/**
 * 生成随机盐值
 */
export function generateSalt(): string {
  const salt = Crypto.randomBytes(SALT_LENGTH);
  return Buffer.from(salt).toString('base64');
}

/**
 * 使用 PBKDF2 从主密码派生密钥
 */
export function deriveKey(
  password: string,
  salt: string,
  iterations: number = DEFAULT_ITERATIONS
): Buffer {
  const saltBuffer = Buffer.from(salt, 'base64');
  const key = Crypto.pbkdf2Sync(
    password,
    saltBuffer,
    iterations,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
  return Buffer.from(key);
}

/**
 * 异步版本的密钥派生（推荐使用，不阻塞 UI）
 */
export function deriveKeyAsync(
  password: string,
  salt: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const saltBuffer = Buffer.from(salt, 'base64');
    Crypto.pbkdf2(
      password,
      saltBuffer,
      iterations,
      KEY_LENGTH,
      PBKDF2_DIGEST,
      (err, key) => {
        if (err) reject(err);
        else resolve(Buffer.from(key));
      }
    );
  });
}

/**
 * 生成验证哈希
 */
export function generateVerificationHash(
  password: string,
  salt: string,
  iterations?: number
): string {
  const key = deriveKey(password, salt, iterations);
  const hash = Crypto.createHash('sha256').update(key).digest();
  return Buffer.from(hash).toString('base64');
}

/**
 * 验证主密码
 */
export function verifyPassword(
  password: string,
  salt: string,
  storedHash: string,
  iterations?: number
): boolean {
  const hash = generateVerificationHash(password, salt, iterations);
  const hashBuffer = Buffer.from(hash, 'base64');
  const storedBuffer = Buffer.from(storedHash, 'base64');
  
  if (hashBuffer.length !== storedBuffer.length) return false;
  return Crypto.timingSafeEqual(hashBuffer, storedBuffer);
}

/**
 * AES-256-GCM 加密
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const nonce = Crypto.randomBytes(NONCE_LENGTH);
  const cipher = Crypto.createCipheriv(ALGORITHM, key, nonce, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    nonce: Buffer.from(nonce).toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: Buffer.from(tag).toString('base64'),
  };
}

/**
 * AES-256-GCM 解密
 */
export function decrypt(encryptedData: EncryptedData, key: Buffer): string {
  const nonce = Buffer.from(encryptedData.nonce, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');

  const decipher = Crypto.createDecipheriv(ALGORITHM, key, nonce, {
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
 * 设置当前会话的派生密钥
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
 * 清除派生密钥
 */
export function clearDerivedKey(): void {
  if (derivedKey) {
    derivedKey.fill(0);
    derivedKey = null;
  }
  currentIterations = null;
}

/**
 * 检查是否已解锁
 */
export function isUnlocked(): boolean {
  return derivedKey !== null;
}

/**
 * 使用会话密钥加密
 */
export function encryptWithSessionKey(plaintext: string): EncryptedData {
  return encrypt(plaintext, getDerivedKey());
}

/**
 * 使用会话密钥解密
 */
export function decryptWithSessionKey(encryptedData: EncryptedData): string {
  return decrypt(encryptedData, getDerivedKey());
}

/**
 * 生成随机字节
 */
export function randomBytes(length: number): Buffer {
  return Buffer.from(Crypto.randomBytes(length));
}

/**
 * SHA-256 哈希
 */
export function sha256(data: string | Buffer): string {
  return Crypto.createHash('sha256').update(data).digest('base64');
}

export { DEFAULT_ITERATIONS };
