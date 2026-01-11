/**
 * Electron API 类型定义
 */

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

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  excludeAmbiguous: boolean;
}

export interface ImportEntry {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  rowNumber?: number;
}

export interface ImportError {
  rowNumber?: number;
  message: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: ImportError[];
  entries?: ImportEntry[];
  newCategories?: string[];
}

export interface BatchResult {
  success: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: string;
  size: number;
  type: 'manual' | 'auto';
}

export interface BackupPreviewData {
  entriesCount: number;
  categoriesCount: number;
  tagsCount: number;
  entries: Array<{ title: string; username: string; url?: string }>;
  categories: Array<{ name: string; icon?: string }>;
  createdAt?: string;
}

export interface ShareQRData {
  sessionId: string;
  qrCodeBase64: string;
  expiresAt: number | string;
  error?: string;
}

export interface TotpSetupData {
  secret: string;
  qrCodeBase64: string;
  recoveryCodes: string[];
}

export interface ElectronAPI {
  // 认证
  setupVault: (password: string) => Promise<{ success: boolean; error?: string }>;
  unlockVault: (password: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => Promise<{ success: boolean }>;
  changeMasterPassword: (oldPwd: string, newPwd: string) => Promise<{ success: boolean; error?: string }>;
  isVaultInitialized: () => Promise<boolean>;
  isVaultUnlocked: () => Promise<boolean>;
  verifyMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  destroyVault: (password: string) => Promise<{ success: boolean; backupPath?: string; error?: string }>;

  // 安全参数
  getSecurityInfo: () => Promise<{
    iterations: number;
    version: number;
    securityLevel: 'low' | 'medium' | 'high';
    needsUpgrade: boolean;
    derivationTimeMs: number;
  }>;
  checkSecurityUpgrade: () => Promise<boolean>;
  upgradeSecurityParams: (password: string, iterations?: number) => Promise<{ success: boolean; error?: string }>;
  checkPasswordStrength: (password: string) => Promise<{
    score: 0 | 1 | 2 | 3 | 4;
    level: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
    feedback: string[];
    isAcceptable: boolean;
  }>;

  // 密码条目
  createEntry: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEntry: (entry: PasswordEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  searchEntries: (query: string) => Promise<PasswordEntry[]>;
  listEntries: () => Promise<PasswordEntry[]>;
  getEntriesByCategory: (categoryId: string) => Promise<PasswordEntry[]>;
  getEntriesByTag: (tagId: string) => Promise<PasswordEntry[]>;

  // 批量操作
  batchMoveCategory: (ids: string[], categoryId: string | null) => Promise<BatchResult>;
  batchAddTags: (ids: string[], tagIds: string[]) => Promise<BatchResult>;
  batchRemoveTags: (ids: string[], tagIds: string[]) => Promise<BatchResult>;
  batchDelete: (ids: string[]) => Promise<BatchResult>;

  // 分类和标签
  createCategory: (category: Omit<Category, 'id'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  listCategories: () => Promise<Category[]>;
  updateCategory: (category: Category) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string, targetCategoryId?: string) => Promise<{ success: boolean; error?: string }>;
  createTag: (tag: Omit<Tag, 'id'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  listTags: () => Promise<Tag[]>;
  updateTag: (tag: Tag) => Promise<{ success: boolean; error?: string }>;
  deleteTag: (id: string) => Promise<{ success: boolean; error?: string }>;

  // 密码生成
  generatePassword: (config: PasswordConfig) => Promise<string>;
  calculateStrength: (password: string) => Promise<{ score: number; level: string; feedback: string[] }>;

  // 导入导出
  downloadTemplate: () => Promise<{ success: boolean; error?: string }>;
  importFile: (filePath: string, format?: string) => Promise<ImportResult>;
  detectFormat: (filePath: string) => Promise<string>;
  executeImport: (entries: ImportEntry[]) => Promise<{ success: number; failed: number; categoriesCreated: number }>;

  // 备份
  createBackup: (backupType?: string) => Promise<{ success: boolean; backup?: BackupInfo; error?: string }>;
  restoreBackup: (backupPath?: string) => Promise<{ success: boolean; error?: string }>;
  restoreBackupWithMode: (backupPath: string, mode: 'overwrite' | 'merge') => Promise<{ success: boolean; added?: number; skipped?: number; error?: string }>;
  listBackups: () => Promise<BackupInfo[]>;
  verifyBackup: (filePath: string) => Promise<{ valid: boolean; error?: string }>;
  previewBackup: (filePath: string) => Promise<{ success: boolean; preview?: BackupPreviewData; error?: string }>;

  // TOTP
  setupTotp: () => Promise<TotpSetupData>;
  enableTotp: (secret: string, recoveryCodes: string[]) => Promise<{ success: boolean; error?: string }>;
  verifyTotp: (code: string) => Promise<{ success: boolean; error?: string }>;
  verifyRecoveryCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  disableTotp: () => Promise<{ success: boolean; error?: string }>;
  isTotpEnabled: () => Promise<boolean>;

  // 二维码分享
  createShareQR: (entryId: string, ttl: number) => Promise<ShareQRData>;
  destroyShare: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  getShareRemainingTime: (sessionId: string) => Promise<number>;

  // 剪贴板
  copyToClipboard: (text: string, clearAfter: number) => Promise<{ success: boolean }>;

  // 自动锁定
  setAutoLockTimeout: (minutes: number) => Promise<{ success: boolean }>;
  getAutoLockTimeout: () => Promise<number>;
  resetIdleTimer: () => Promise<{ success: boolean }>;
  onVaultLocked: (callback: () => void) => () => void;

  // 窗口控制
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  windowSetAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  windowIsAlwaysOnTop: () => Promise<boolean>;

  // 文件对话框
  showOpenDialog: (options: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: unknown) => Promise<{ canceled: boolean; filePath?: string }>;

  // 云同步
  syncBindQuark: () => Promise<{ success: boolean; nickname?: string; error?: string }>;
  syncUnbindQuark: () => Promise<{ success: boolean; error?: string }>;
  syncGetAuthState: () => Promise<{ isAuthenticated: boolean; nickname?: string; provider?: string }>;
  syncBindWithCookie: (cookie: string) => Promise<{ success: boolean; nickname?: string; error?: string }>;
  syncUpload: () => Promise<{ success: boolean; error?: string }>;
  syncDownload: () => Promise<{ success: boolean; needsRestore?: boolean; error?: string }>;
  syncConfirmRestore: (masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  syncGetInfo: () => Promise<{
    status: string;
    lastSyncTime?: string;
    localVersion: number;
    cloudVersion?: number;
    isAuthenticated: boolean;
    nickname?: string;
  }>;
  syncGetConfig: () => Promise<{
    enabled: boolean;
    cloudFolderPath: string;
    cloudFolderId: string;
    checkOnStartup: boolean;
    remindOnExit: boolean;
  }>;
  syncSetConfig: (config: unknown) => Promise<{ success: boolean; error?: string }>;
  syncExportFile: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  syncImportFile: () => Promise<{ success: boolean; needsRestore?: boolean; error?: string }>;
  syncClearCloudData: () => Promise<{ success: boolean; error?: string }>;
  syncHasUnsyncedChanges: () => Promise<boolean>;
  syncMarkLocalChanged: () => Promise<{ success: boolean }>;

  // 智能图标
  getSmartIcon: (title: string, url?: string) => Promise<{ icon: string | null; source: 'favicon' | 'keyword' | 'none' }>;
  matchIconByKeyword: (title: string, url?: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
