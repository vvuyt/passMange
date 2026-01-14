/**
 * 数据模型定义（从 Electron 版本复用）
 */

// 密码条目
export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  categoryId?: string;
  icon?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}

// 分类
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isDefault: boolean;
}

// 标签
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// 密码生成配置
export interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  excludeAmbiguous: boolean;
}

// 加密数据包装
export interface EncryptedData {
  nonce: string;      // Base64 编码的 12 bytes
  ciphertext: string; // Base64 编码
  tag: string;        // Base64 编码的 16 bytes
}

// 密码库元数据
export interface VaultMeta {
  salt: string;
  verificationHash: string;
  totpEnabled: boolean;
  totpSecretEncrypted?: string;
  recoveryCodesEncrypted?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 备份信息
export interface BackupInfo {
  id: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  createdAt: string;
  backupType: 'manual' | 'auto';
}

// 安全信息
export interface SecurityInfo {
  iterations: number;
  version: number;
  securityLevel: 'low' | 'medium' | 'high';
  needsUpgrade: boolean;
  derivationTimeMs?: number;
}
