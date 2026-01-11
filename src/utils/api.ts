/**
 * Electron IPC API 封装
 */

import type { 
  PasswordEntry, 
  Category, 
  Tag, 
  PasswordConfig,
  ImportEntry,
  ImportError,
  ImportResult,
  BackupInfo,
  TotpSetupData,
  ShareQRData,
  BatchResult
} from '../types/electron';

// 重新导出类型供外部使用
export type { ImportEntry, ImportError, ImportResult, BackupInfo, TotpSetupData, ShareQRData, BatchResult };

// 获取 electronAPI
const api = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  throw new Error('Electron API not available');
};

// ========== 认证 ==========
export async function checkVaultInitialized(): Promise<boolean> {
  return api().isVaultInitialized();
}

export async function setupVault(password: string): Promise<void> {
  const result = await api().setupVault(password);
  if (!result.success) {
    throw new Error(result.error || '设置失败');
  }
}

export async function unlockVault(password: string): Promise<void> {
  const result = await api().unlockVault(password);
  if (!result.success) {
    throw new Error(result.error || '解锁失败');
  }
}

export async function lockVault(): Promise<void> {
  await api().lockVault();
}

export async function changeMasterPassword(oldPwd: string, newPwd: string): Promise<void> {
  const result = await api().changeMasterPassword(oldPwd, newPwd);
  if (!result.success) {
    throw new Error(result.error || '修改失败');
  }
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  const result = await api().verifyMasterPassword(password);
  return result.success;
}

export async function destroyVault(password: string): Promise<string> {
  const result = await api().destroyVault(password);
  if (!result.success) {
    throw new Error(result.error || '销毁失败');
  }
  return result.backupPath || '';
}

export async function resetVault(): Promise<void> {
  const result = await api().resetVault();
  if (!result.success) {
    throw new Error(result.error || '重置失败');
  }
}

// ========== 安全参数 ==========
export interface SecurityInfo {
  iterations: number;
  version: number;
  securityLevel: 'low' | 'medium' | 'high';
  needsUpgrade: boolean;
  derivationTimeMs: number;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  level: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  feedback: string[];
  isAcceptable: boolean;
}

export async function getSecurityInfo(): Promise<SecurityInfo> {
  return api().getSecurityInfo();
}

export async function checkSecurityUpgrade(): Promise<boolean> {
  return api().checkSecurityUpgrade();
}

export async function upgradeSecurityParams(password: string, iterations?: number): Promise<void> {
  const result = await api().upgradeSecurityParams(password, iterations);
  if (!result.success) {
    throw new Error(result.error || '升级失败');
  }
}

export async function checkPasswordStrength(password: string): Promise<PasswordStrengthResult> {
  return api().checkPasswordStrength(password);
}

// ========== 密码条目 ==========
export async function listEntries(): Promise<PasswordEntry[]> {
  return api().listEntries();
}

export async function createEntry(
  entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  return api().createEntry(entry);
}

export async function updateEntry(entry: PasswordEntry): Promise<void> {
  await api().updateEntry(entry);
}

export async function deleteEntry(id: string): Promise<void> {
  await api().deleteEntry(id);
}

export async function searchEntries(query: string): Promise<PasswordEntry[]> {
  return api().searchEntries(query);
}

export async function getEntriesByCategory(categoryId: string): Promise<PasswordEntry[]> {
  return api().getEntriesByCategory(categoryId);
}

export async function getEntriesByTag(tagId: string): Promise<PasswordEntry[]> {
  return api().getEntriesByTag(tagId);
}

// ========== 批量操作 ==========
export async function batchMoveCategory(ids: string[], categoryId: string | null): Promise<BatchResult> {
  return api().batchMoveCategory(ids, categoryId);
}

export async function batchAddTags(ids: string[], tagIds: string[]): Promise<BatchResult> {
  return api().batchAddTags(ids, tagIds);
}

export async function batchRemoveTags(ids: string[], tagIds: string[]): Promise<BatchResult> {
  return api().batchRemoveTags(ids, tagIds);
}

export async function batchDelete(ids: string[]): Promise<BatchResult> {
  return api().batchDelete(ids);
}

// ========== 分类 ==========
export async function listCategories(): Promise<Category[]> {
  return api().listCategories();
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<string> {
  const result = await api().createCategory(category);
  if (!result.success || !result.id) {
    throw new Error(result.error || '创建分类失败');
  }
  return result.id;
}

export async function updateCategory(category: Category): Promise<void> {
  const result = await api().updateCategory(category);
  if (!result.success) {
    throw new Error(result.error || '更新分类失败');
  }
}

export async function deleteCategory(id: string, targetCategoryId?: string): Promise<void> {
  const result = await api().deleteCategory(id, targetCategoryId);
  if (!result.success) {
    throw new Error(result.error || '删除分类失败');
  }
}

// ========== 标签 ==========
export async function listTags(): Promise<Tag[]> {
  return api().listTags();
}

export async function createTag(tag: Omit<Tag, 'id'>): Promise<string> {
  const result = await api().createTag(tag);
  if (!result.success || !result.id) {
    throw new Error(result.error || '创建标签失败');
  }
  return result.id;
}

export async function updateTag(tag: Tag): Promise<void> {
  const result = await api().updateTag(tag);
  if (!result.success) {
    throw new Error(result.error || '更新标签失败');
  }
}

export async function deleteTag(id: string): Promise<void> {
  const result = await api().deleteTag(id);
  if (!result.success) {
    throw new Error(result.error || '删除标签失败');
  }
}

// ========== 密码生成 ==========
export async function generatePassword(config: PasswordConfig): Promise<string> {
  return api().generatePassword(config);
}

export async function calculateStrength(password: string): Promise<{ score: number; level: string; feedback: string[] }> {
  return api().calculateStrength(password);
}

// ========== 导入导出 ==========
export async function downloadTemplate(): Promise<void> {
  const result = await api().downloadTemplate();
  if (!result.success) {
    throw new Error(result.error || '下载模板失败');
  }
}

export async function detectFormat(filePath: string): Promise<string> {
  return api().detectFormat(filePath);
}

export async function importFile(filePath: string, format?: string): Promise<ImportResult> {
  return api().importFile(filePath, format);
}

export async function executeImport(entries: ImportEntry[]): Promise<{ success: number; failed: number; categoriesCreated: number }> {
  return api().executeImport(entries);
}

// ========== 备份 ==========
export async function createBackup(backupType: 'manual' | 'auto' = 'manual'): Promise<BackupInfo> {
  const result = await api().createBackup(backupType);
  if (!result.success || !result.backup) {
    throw new Error(result.error || '创建备份失败');
  }
  return result.backup;
}

export async function restoreBackup(backupPath?: string): Promise<void> {
  const result = await api().restoreBackup(backupPath);
  if (!result.success) {
    throw new Error(result.error || '恢复备份失败');
  }
}

export async function restoreBackupWithMode(
  backupPath: string, 
  mode: 'overwrite' | 'merge'
): Promise<{ added: number; skipped: number }> {
  const result = await api().restoreBackupWithMode(backupPath, mode);
  if (!result.success) {
    throw new Error(result.error || '恢复备份失败');
  }
  return { added: result.added || 0, skipped: result.skipped || 0 };
}

export async function listBackups(): Promise<BackupInfo[]> {
  return api().listBackups();
}

export async function verifyBackup(filePath: string): Promise<{ valid: boolean; error?: string }> {
  return api().verifyBackup(filePath);
}

export interface BackupPreview {
  entriesCount: number;
  categoriesCount: number;
  tagsCount: number;
  entries: Array<{ title: string; username: string; url?: string }>;
  categories: Array<{ name: string; icon?: string }>;
  createdAt?: string;
}

export async function previewBackup(filePath: string): Promise<BackupPreview> {
  const result = await api().previewBackup(filePath);
  if (!result.success || !result.preview) {
    throw new Error(result.error || '预览备份失败');
  }
  return result.preview;
}

// ========== TOTP ==========
export async function setupTotp(): Promise<TotpSetupData> {
  return api().setupTotp();
}

export async function enableTotp(secret: string, recoveryCodes: string[]): Promise<void> {
  const result = await api().enableTotp(secret, recoveryCodes);
  if (!result.success) {
    throw new Error(result.error || '启用 TOTP 失败');
  }
}

export async function verifyTotp(code: string): Promise<boolean> {
  const result = await api().verifyTotp(code);
  return result.success;
}

export async function verifyRecoveryCode(code: string): Promise<boolean> {
  const result = await api().verifyRecoveryCode(code);
  return result.success;
}

export async function disableTotp(): Promise<void> {
  const result = await api().disableTotp();
  if (!result.success) {
    throw new Error(result.error || '禁用 TOTP 失败');
  }
}

export async function isTotpEnabled(): Promise<boolean> {
  return api().isTotpEnabled();
}

// ========== 二维码分享 ==========
export async function createShareQR(entryId: string, ttl: number): Promise<ShareQRData> {
  const result = await api().createShareQR(entryId, ttl);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

export async function destroyShare(sessionId: string): Promise<void> {
  const result = await api().destroyShare(sessionId);
  if (!result.success) {
    throw new Error(result.error || '销毁分享失败');
  }
}

export async function getShareRemainingTime(sessionId: string): Promise<number> {
  return api().getShareRemainingTime(sessionId);
}

// ========== 剪贴板 ==========
export async function copyToClipboard(text: string, clearAfter: number = 30): Promise<void> {
  await api().copyToClipboard(text, clearAfter);
}

// ========== 自动锁定 ==========
export async function setAutoLockTimeout(minutes: number): Promise<void> {
  await api().setAutoLockTimeout(minutes);
}

export async function getAutoLockTimeout(): Promise<number> {
  return api().getAutoLockTimeout();
}

export async function resetIdleTimer(): Promise<void> {
  await api().resetIdleTimer();
}

export function onVaultLocked(callback: () => void): () => void {
  return api().onVaultLocked(callback);
}

// ========== 文件对话框 ==========
export async function showOpenDialog(options: {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<{ canceled: boolean; filePaths: string[] }> {
  return api().showOpenDialog(options);
}

export async function showSaveDialog(options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<{ canceled: boolean; filePath?: string }> {
  return api().showSaveDialog(options);
}


// ========== 云同步 ==========
export interface SyncAuthState {
  isAuthenticated: boolean;
  nickname?: string;
  provider?: string;
}

export interface SyncInfo {
  status: 'synced' | 'local_changed' | 'cloud_changed' | 'conflict' | 'not_connected';
  lastSyncTime?: string;
  localVersion: number;
  cloudVersion?: number;
  isAuthenticated: boolean;
  nickname?: string;
}

export interface SyncConfig {
  enabled: boolean;
  cloudFolderPath: string;
  cloudFolderId: string;
  checkOnStartup: boolean;
  remindOnExit: boolean;
}

export async function syncBindQuark(): Promise<{ success: boolean; nickname?: string; error?: string }> {
  return api().syncBindQuark();
}

export async function syncUnbindQuark(): Promise<void> {
  const result = await api().syncUnbindQuark();
  if (!result.success) {
    throw new Error(result.error || '解绑失败');
  }
}

export async function syncGetAuthState(): Promise<SyncAuthState> {
  return api().syncGetAuthState();
}

export async function syncBindWithCookie(cookie: string): Promise<{ success: boolean; nickname?: string; error?: string }> {
  return api().syncBindWithCookie(cookie);
}

export async function syncUpload(): Promise<{ success: boolean; error?: string }> {
  return api().syncUpload();
}

export async function syncDownload(): Promise<{ success: boolean; needsRestore?: boolean; error?: string }> {
  return api().syncDownload();
}

export async function syncConfirmRestore(masterPassword: string): Promise<{ success: boolean; error?: string }> {
  return api().syncConfirmRestore(masterPassword);
}

export async function syncGetInfo(): Promise<SyncInfo> {
  const result = await api().syncGetInfo();
  return {
    ...result,
    status: result.status as SyncInfo['status'],
  };
}

export async function syncGetConfig(): Promise<SyncConfig> {
  return api().syncGetConfig();
}

export async function syncSetConfig(config: Partial<SyncConfig>): Promise<void> {
  const result = await api().syncSetConfig(config);
  if (!result.success) {
    throw new Error(result.error || '保存配置失败');
  }
}

export async function syncExportFile(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  return api().syncExportFile();
}

export async function syncImportFile(): Promise<{ success: boolean; needsRestore?: boolean; error?: string }> {
  return api().syncImportFile();
}

export async function syncClearCloudData(): Promise<void> {
  const result = await api().syncClearCloudData();
  if (!result.success) {
    throw new Error(result.error || '清除云端数据失败');
  }
}

export async function syncHasUnsyncedChanges(): Promise<boolean> {
  return api().syncHasUnsyncedChanges();
}

export async function syncMarkLocalChanged(): Promise<void> {
  await api().syncMarkLocalChanged();
}


// ========== 智能图标 ==========
export interface SmartIconResult {
  icon: string | null;
  source: 'favicon' | 'keyword' | 'none';
}

export async function getSmartIcon(title: string, url?: string): Promise<SmartIconResult> {
  return api().getSmartIcon(title, url);
}

export async function matchIconByKeyword(title: string, url?: string): Promise<string | null> {
  return api().matchIconByKeyword(title, url);
}


// ========== 快捷键设置 ==========
export interface ShortcutConfig {
  quickEntry: string;
  screenshot: string;
  enabled: boolean;
}

export async function getShortcutConfig(): Promise<ShortcutConfig> {
  const result = await api().shortcutGetConfig();
  if (!result.success) {
    throw new Error(result.error || '获取快捷键配置失败');
  }
  return result.config!;
}

export async function updateShortcut(action: string, accelerator: string): Promise<ShortcutConfig> {
  const result = await api().shortcutUpdate(action, accelerator);
  if (!result.success) {
    throw new Error(result.error || '更新快捷键失败');
  }
  return result.config!;
}

export async function validateShortcut(accelerator: string): Promise<boolean> {
  const result = await api().shortcutValidate(accelerator);
  if (!result.success) {
    throw new Error(result.error || '验证快捷键失败');
  }
  return result.isValid!;
}

export async function setShortcutEnabled(enabled: boolean): Promise<ShortcutConfig> {
  const result = await api().shortcutSetEnabled(enabled);
  if (!result.success) {
    throw new Error(result.error || '设置快捷键启用状态失败');
  }
  return result.config!;
}

export async function resetShortcuts(): Promise<ShortcutConfig> {
  const result = await api().shortcutReset();
  if (!result.success) {
    throw new Error(result.error || '重置快捷键失败');
  }
  return result.config!;
}

// ========== OCR 设置 ==========
export type OCRLanguage = 'chi_sim' | 'eng' | 'chi_sim+eng';

export async function initializeOCR(): Promise<void> {
  const result = await api().ocrInitialize();
  if (!result.success) {
    throw new Error(result.error || 'OCR 初始化失败');
  }
}

export async function setOCRLanguage(lang: OCRLanguage): Promise<void> {
  const result = await api().ocrSetLanguage(lang);
  if (!result.success) {
    throw new Error(result.error || '设置 OCR 语言失败');
  }
}

export async function getOCRLanguage(): Promise<OCRLanguage> {
  const result = await api().ocrGetLanguage();
  if (!result.success) {
    throw new Error(result.error || '获取 OCR 语言失败');
  }
  return result.language as OCRLanguage;
}

export async function isOCRReady(): Promise<boolean> {
  const result = await api().ocrIsReady();
  if (!result.success) {
    throw new Error(result.error || '检查 OCR 状态失败');
  }
  return result.isReady!;
}

// ========== 快速录入 ==========
export async function showQuickEntry(): Promise<void> {
  await api().quickEntryShow();
}

export async function hideQuickEntry(): Promise<void> {
  await api().quickEntryHide();
}
