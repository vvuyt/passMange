/**
 * IPC 处理器
 * 注册所有 IPC 通信处理函数
 */

import { ipcMain, dialog, clipboard } from 'electron';
import { initDatabase, isVaultInitialized } from '../storage/db';
import {
  setupVault,
  unlockVault,
  lockVault,
  changeMasterPassword,
  verifyMasterPassword,
  destroyVault,
  getVaultSecurityInfo,
  checkSecurityUpgrade,
  upgradeSecurityParams,
} from '../storage/vault';
import {
  createEntry,
  listEntries,
  updateEntry,
  deleteEntry,
  searchEntries,
  getEntriesByCategory,
  getEntriesByTag,
} from '../storage/entries';
import {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
} from '../storage/categories';
import {
  createTag,
  listTags,
  updateTag,
  deleteTag,
} from '../storage/tags';
import { generatePassword, calculateStrength } from '../generator';
import { isUnlocked } from '../crypto';
import { checkPasswordStrength } from '../crypto/password-strength';
import { downloadTemplate, importFile, detectFormat, executeImport } from '../import';
import { createBackup, restoreBackup, listBackups, verifyBackup, previewBackup } from '../backup';
import { setupTotp, enableTotp, disableTotp, verifyTotp, verifyRecoveryCode, isTotpEnabled } from '../totp';
import { createShareQR, destroyShare, getShareRemainingTime } from '../qrshare';
import { getSyncManager } from '../sync/sync-manager';
import { getSyncAuthManager } from '../sync/auth';
import { SyncConfig } from '../sync/types';
import { getSmartIcon, matchIconByKeyword } from '../favicon';
import { batchMoveCategory, batchAddTags, batchRemoveTags, batchDelete } from '../storage/batch';

// 剪贴板清除定时器
let clipboardTimer: NodeJS.Timeout | null = null;

/**
 * 标记本地数据已更改（用于同步状态跟踪）
 */
function markDataChanged(): void {
  try {
    const syncManager = getSyncManager();
    syncManager.markLocalChanged();
  } catch {
    // 同步模块未初始化，忽略
  }
}

/**
 * 注册所有 IPC 处理器
 */
export async function registerIpcHandlers(): Promise<void> {
  // 初始化数据库
  await initDatabase();

  // ========== 认证相关 ==========
  ipcMain.handle('setup-vault', async (_event, password: string) => {
    try {
      setupVault(password);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('unlock-vault', async (_event, password: string) => {
    try {
      const success = unlockVault(password);
      if (!success) {
        return { success: false, error: '密码错误' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('lock-vault', async () => {
    lockVault();
    return { success: true };
  });

  ipcMain.handle('change-master-password', async (_event, oldPwd: string, newPwd: string) => {
    try {
      changeMasterPassword(oldPwd, newPwd);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('is-vault-initialized', async () => {
    return isVaultInitialized();
  });

  ipcMain.handle('is-vault-unlocked', async () => {
    return isUnlocked();
  });

  ipcMain.handle('verify-master-password', async (_event, password: string) => {
    try {
      return { success: verifyMasterPassword(password) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('destroy-vault', async (_event, password: string) => {
    try {
      const backupPath = await destroyVault(password);
      return { success: true, backupPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ========== 安全参数 ==========
  ipcMain.handle('get-security-info', async () => {
    try {
      return getVaultSecurityInfo();
    } catch (error) {
      return { iterations: 0, version: 0, securityLevel: 'low', needsUpgrade: false, derivationTimeMs: 0 };
    }
  });

  ipcMain.handle('check-security-upgrade', async () => {
    try {
      return checkSecurityUpgrade();
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('upgrade-security', async (_event, password: string, iterations?: number) => {
    try {
      upgradeSecurityParams(password, iterations);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('check-password-strength', async (_event, password: string) => {
    try {
      return checkPasswordStrength(password);
    } catch (error) {
      return { score: 0, level: 'very-weak', feedback: [], isAcceptable: false };
    }
  });


  // ========== 密码条目 ==========
  ipcMain.handle('create-entry', async (_event, entry: unknown) => {
    try {
      const id = createEntry(entry as Parameters<typeof createEntry>[0]);
      markDataChanged();
      return { success: true, id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('update-entry', async (_event, entry: unknown) => {
    try {
      updateEntry(entry as Parameters<typeof updateEntry>[0]);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('delete-entry', async (_event, id: string) => {
    try {
      deleteEntry(id);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('search-entries', async (_event, query: string) => {
    try {
      return searchEntries(query);
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('list-entries', async () => {
    try {
      return listEntries();
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('get-entries-by-category', async (_event, categoryId: string) => {
    try {
      return getEntriesByCategory(categoryId);
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('get-entries-by-tag', async (_event, tagId: string) => {
    try {
      return getEntriesByTag(tagId);
    } catch (error) {
      return [];
    }
  });

  // ========== 批量操作 ==========
  ipcMain.handle('entries:batch-move-category', async (_event, ids: string[], categoryId: string | null) => {
    try {
      const result = batchMoveCategory(ids, categoryId);
      if (result.success > 0) {
        markDataChanged();
      }
      return result;
    } catch (error) {
      return { success: 0, failed: ids.length, errors: [{ id: '', error: (error as Error).message }] };
    }
  });

  ipcMain.handle('entries:batch-add-tags', async (_event, ids: string[], tagIds: string[]) => {
    try {
      const result = batchAddTags(ids, tagIds);
      if (result.success > 0) {
        markDataChanged();
      }
      return result;
    } catch (error) {
      return { success: 0, failed: ids.length, errors: [{ id: '', error: (error as Error).message }] };
    }
  });

  ipcMain.handle('entries:batch-remove-tags', async (_event, ids: string[], tagIds: string[]) => {
    try {
      const result = batchRemoveTags(ids, tagIds);
      if (result.success > 0) {
        markDataChanged();
      }
      return result;
    } catch (error) {
      return { success: 0, failed: ids.length, errors: [{ id: '', error: (error as Error).message }] };
    }
  });

  ipcMain.handle('entries:batch-delete', async (_event, ids: string[]) => {
    try {
      const result = batchDelete(ids);
      if (result.success > 0) {
        markDataChanged();
      }
      return result;
    } catch (error) {
      return { success: 0, failed: ids.length, errors: [{ id: '', error: (error as Error).message }] };
    }
  });

  // ========== 分类 ==========
  ipcMain.handle('create-category', async (_event, category: unknown) => {
    try {
      const id = createCategory(category as Parameters<typeof createCategory>[0]);
      markDataChanged();
      return { success: true, id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('list-categories', async () => {
    try {
      return listCategories();
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('update-category', async (_event, category: unknown) => {
    try {
      updateCategory(category as Parameters<typeof updateCategory>[0]);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('delete-category', async (_event, id: string, targetCategoryId?: string) => {
    try {
      deleteCategory(id, targetCategoryId);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });


  // ========== 标签 ==========
  ipcMain.handle('create-tag', async (_event, tag: unknown) => {
    try {
      const id = createTag(tag as Parameters<typeof createTag>[0]);
      markDataChanged();
      return { success: true, id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('list-tags', async () => {
    try {
      return listTags();
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('update-tag', async (_event, tag: unknown) => {
    try {
      updateTag(tag as Parameters<typeof updateTag>[0]);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('delete-tag', async (_event, id: string) => {
    try {
      deleteTag(id);
      markDataChanged();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ========== 密码生成 ==========
  ipcMain.handle('generate-password', async (_event, config: unknown) => {
    try {
      return generatePassword(config as Parameters<typeof generatePassword>[0]);
    } catch (error) {
      return '';
    }
  });

  ipcMain.handle('calculate-strength', async (_event, password: string) => {
    try {
      return calculateStrength(password);
    } catch (error) {
      return { score: 0, level: 'very-weak', feedback: [] };
    }
  });

  // ========== 导入导出 ==========
  ipcMain.handle('download-template', async () => {
    try {
      await downloadTemplate();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('import-file', async (_event, filePath: string, format?: string) => {
    try {
      return importFile(filePath, format);
    } catch (error) {
      return { success: 0, failed: 0, duplicates: 0, errors: [{ rowNumber: 0, message: (error as Error).message }] };
    }
  });

  ipcMain.handle('detect-format', async (_event, filePath: string) => {
    try {
      return detectFormat(filePath);
    } catch (error) {
      return 'unknown';
    }
  });

  ipcMain.handle('execute-import', async (_event, entries: unknown[]) => {
    try {
      const result = executeImport(entries as Parameters<typeof executeImport>[0]);
      if (result.success > 0) {
        markDataChanged();
      }
      return result;
    } catch (error) {
      return { success: 0, failed: 0, categoriesCreated: 0 };
    }
  });

  // ========== 备份 ==========
  ipcMain.handle('create-backup', async (_event, backupType?: 'manual' | 'auto') => {
    try {
      const backup = await createBackup(backupType || 'manual');
      // 转换字段名以匹配前端类型
      return { 
        success: true, 
        backup: {
          filename: backup.filePath.split(/[/\\]/).pop() || '',
          path: backup.filePath,
          createdAt: backup.createdAt,
          size: backup.fileSize || 0,
          type: backup.backupType,
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('restore-backup', async (_event, backupPath?: string) => {
    try {
      await restoreBackup(backupPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('list-backups', async () => {
    try {
      const backups = listBackups();
      // 转换字段名以匹配前端类型
      return backups.map(b => ({
        filename: b.filePath.split(/[/\\]/).pop() || '',
        path: b.filePath,
        createdAt: b.createdAt,
        size: b.fileSize || 0,
        type: b.backupType,
      }));
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('verify-backup', async (_event, filePath: string) => {
    try {
      return verifyBackup(filePath);
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('preview-backup', async (_event, filePath: string) => {
    try {
      const preview = await previewBackup(filePath);
      return { success: true, preview };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('restore-backup-with-mode', async (_event, backupPath: string, mode: 'overwrite' | 'merge') => {
    try {
      const result = await restoreBackup(backupPath, mode);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });


  // ========== TOTP ==========
  ipcMain.handle('setup-totp', async () => {
    try {
      return await setupTotp();
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('enable-totp', async (_event, secret: string, recoveryCodes: string[]) => {
    try {
      enableTotp(secret, recoveryCodes);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('verify-totp', async (_event, code: string) => {
    try {
      const valid = verifyTotp(code);
      return { success: valid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('verify-recovery-code', async (_event, code: string) => {
    try {
      const valid = verifyRecoveryCode(code);
      return { success: valid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('disable-totp', async () => {
    try {
      disableTotp();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('is-totp-enabled', async () => {
    try {
      return isTotpEnabled();
    } catch (error) {
      return false;
    }
  });

  // ========== 二维码分享 ==========
  ipcMain.handle('create-share-qr', async (_event, entryId: string, ttl: number) => {
    try {
      return await createShareQR(entryId, ttl);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('destroy-share', async (_event, sessionId: string) => {
    try {
      destroyShare(sessionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('get-share-remaining-time', async (_event, sessionId: string) => {
    try {
      return getShareRemainingTime(sessionId);
    } catch (error) {
      return 0;
    }
  });

  // ========== 剪贴板 ==========
  ipcMain.handle('copy-to-clipboard', async (_event, text: string, clearAfter: number) => {
    clipboard.writeText(text);
    
    // 清除之前的定时器
    if (clipboardTimer) {
      clearTimeout(clipboardTimer);
    }
    
    // 设置自动清除
    if (clearAfter > 0) {
      clipboardTimer = setTimeout(() => {
        // 只有当剪贴板内容仍是我们复制的内容时才清除
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
        clipboardTimer = null;
      }, clearAfter * 1000);
    }
    
    return { success: true };
  });

  // ========== 文件对话框 ==========
  ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    return dialog.showSaveDialog(options);
  });

  // ========== 云同步 ==========
  ipcMain.handle('sync:bind-quark', async () => {
    try {
      const syncManager = getSyncManager();
      return await syncManager.bindQuarkCloud();
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:unbind-quark', async () => {
    try {
      const syncManager = getSyncManager();
      await syncManager.unbindQuarkCloud();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:get-auth-state', async () => {
    try {
      const authManager = getSyncAuthManager();
      return await authManager.getAuthState();
    } catch (error) {
      return { isAuthenticated: false };
    }
  });

  ipcMain.handle('sync:bind-with-cookie', async (_event, cookie: string) => {
    try {
      const authManager = getSyncAuthManager();
      return await authManager.bindWithCookie(cookie);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:upload', async () => {
    try {
      const syncManager = getSyncManager();
      return await syncManager.uploadToCloud();
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:download', async () => {
    try {
      const syncManager = getSyncManager();
      return await syncManager.downloadFromCloud();
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:confirm-restore', async (_event, masterPassword: string) => {
    try {
      const syncManager = getSyncManager();
      return await syncManager.confirmRestore(masterPassword);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:get-info', async () => {
    try {
      const syncManager = getSyncManager();
      return await syncManager.getSyncInfo();
    } catch (error) {
      return {
        status: 'not_connected',
        localVersion: 0,
        isAuthenticated: false,
      };
    }
  });

  ipcMain.handle('sync:get-config', async () => {
    try {
      const syncManager = getSyncManager();
      return syncManager.getConfig();
    } catch (error) {
      return {
        enabled: false,
        cloudFolderPath: '/密码管理器',
        cloudFolderId: '',
        checkOnStartup: false,
        remindOnExit: true,
      };
    }
  });

  ipcMain.handle('sync:set-config', async (_event, config: Partial<SyncConfig>) => {
    try {
      const syncManager = getSyncManager();
      syncManager.setConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:export-file', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出同步文件',
        defaultPath: `password_sync_${Date.now()}.pwbak`,
        filters: [{ name: '密码管理器备份', extensions: ['pwbak'] }],
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消' };
      }
      
      const syncManager = getSyncManager();
      await syncManager.exportSyncFile(result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:import-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入同步文件',
        filters: [{ name: '密码管理器备份', extensions: ['pwbak'] }],
        properties: ['openFile'],
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消' };
      }
      
      const syncManager = getSyncManager();
      return await syncManager.importSyncFile(result.filePaths[0]);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:clear-cloud-data', async () => {
    try {
      const syncManager = getSyncManager();
      await syncManager.clearCloudData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('sync:has-unsynced-changes', async () => {
    try {
      const syncManager = getSyncManager();
      return syncManager.hasUnsyncedChanges();
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('sync:mark-local-changed', async () => {
    try {
      const syncManager = getSyncManager();
      syncManager.markLocalChanged();
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  });

  // ========== 智能图标 ==========
  ipcMain.handle('get-smart-icon', async (_event, title: string, url?: string) => {
    try {
      return await getSmartIcon(title, url);
    } catch (error) {
      return { icon: null, source: 'none' };
    }
  });

  ipcMain.handle('match-icon-by-keyword', async (_event, title: string, url?: string) => {
    try {
      return matchIconByKeyword(title, url);
    } catch (error) {
      return null;
    }
  });

  console.log('IPC handlers registered');
}
