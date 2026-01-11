/**
 * 数据模型定义
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
  icon?: string;  // 自定义图标（emoji 或 base64 图片）
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

// 导入结果
export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: ImportError[];
}

// 导入错误
export interface ImportError {
  rowNumber: number;
  message: string;
}

// 导入条目
export interface ImportEntry {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;  // 分类名称
  rowNumber: number;
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

// 二维码分享数据
export interface ShareQRData {
  sessionId: string;
  qrCodeBase64: string;
  expiresAt: string;
}

// 密码库元数据
export interface VaultMeta {
  salt: string;           // Base64 编码
  verificationHash: string; // Base64 编码
  totpEnabled: boolean;
  totpSecretEncrypted?: string;
  recoveryCodesEncrypted?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
