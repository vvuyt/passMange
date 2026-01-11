import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 认证相关
  setupVault: (password: string) => ipcRenderer.invoke('setup-vault', password),
  unlockVault: (password: string) => ipcRenderer.invoke('unlock-vault', password),
  lockVault: () => ipcRenderer.invoke('lock-vault'),
  changeMasterPassword: (oldPwd: string, newPwd: string) =>
    ipcRenderer.invoke('change-master-password', oldPwd, newPwd),
  isVaultInitialized: () => ipcRenderer.invoke('is-vault-initialized'),
  isVaultUnlocked: () => ipcRenderer.invoke('is-vault-unlocked'),
  verifyMasterPassword: (password: string) => ipcRenderer.invoke('verify-master-password', password),
  destroyVault: (password: string) => ipcRenderer.invoke('destroy-vault', password),
  resetVault: () => ipcRenderer.invoke('reset-vault'),

  // 安全参数
  getSecurityInfo: () => ipcRenderer.invoke('get-security-info'),
  checkSecurityUpgrade: () => ipcRenderer.invoke('check-security-upgrade'),
  upgradeSecurityParams: (password: string, iterations?: number) => 
    ipcRenderer.invoke('upgrade-security', password, iterations),
  checkPasswordStrength: (password: string) => ipcRenderer.invoke('check-password-strength', password),

  // 密码条目
  createEntry: (entry: unknown) => ipcRenderer.invoke('create-entry', entry),
  updateEntry: (entry: unknown) => ipcRenderer.invoke('update-entry', entry),
  deleteEntry: (id: string) => ipcRenderer.invoke('delete-entry', id),
  searchEntries: (query: string) => ipcRenderer.invoke('search-entries', query),
  listEntries: () => ipcRenderer.invoke('list-entries'),
  getEntriesByCategory: (categoryId: string) => ipcRenderer.invoke('get-entries-by-category', categoryId),
  getEntriesByTag: (tagId: string) => ipcRenderer.invoke('get-entries-by-tag', tagId),

  // 批量操作
  batchMoveCategory: (ids: string[], categoryId: string | null) => 
    ipcRenderer.invoke('entries:batch-move-category', ids, categoryId),
  batchAddTags: (ids: string[], tagIds: string[]) => 
    ipcRenderer.invoke('entries:batch-add-tags', ids, tagIds),
  batchRemoveTags: (ids: string[], tagIds: string[]) => 
    ipcRenderer.invoke('entries:batch-remove-tags', ids, tagIds),
  batchDelete: (ids: string[]) => 
    ipcRenderer.invoke('entries:batch-delete', ids),

  // 分类和标签
  createCategory: (category: unknown) => ipcRenderer.invoke('create-category', category),
  listCategories: () => ipcRenderer.invoke('list-categories'),
  updateCategory: (category: unknown) => ipcRenderer.invoke('update-category', category),
  deleteCategory: (id: string, targetCategoryId?: string) =>
    ipcRenderer.invoke('delete-category', id, targetCategoryId),
  createTag: (tag: unknown) => ipcRenderer.invoke('create-tag', tag),
  listTags: () => ipcRenderer.invoke('list-tags'),
  updateTag: (tag: unknown) => ipcRenderer.invoke('update-tag', tag),
  deleteTag: (id: string) => ipcRenderer.invoke('delete-tag', id),

  // 密码生成
  generatePassword: (config: unknown) => ipcRenderer.invoke('generate-password', config),
  calculateStrength: (password: string) => ipcRenderer.invoke('calculate-strength', password),

  // 导入导出
  downloadTemplate: () => ipcRenderer.invoke('download-template'),
  importFile: (filePath: string, format?: string) =>
    ipcRenderer.invoke('import-file', filePath, format),
  detectFormat: (filePath: string) => ipcRenderer.invoke('detect-format', filePath),
  executeImport: (entries: unknown[]) => ipcRenderer.invoke('execute-import', entries),

  // 备份
  createBackup: (backupType?: string) => ipcRenderer.invoke('create-backup', backupType),
  restoreBackup: (backupPath?: string) => ipcRenderer.invoke('restore-backup', backupPath),
  restoreBackupWithMode: (backupPath: string, mode: 'overwrite' | 'merge') => 
    ipcRenderer.invoke('restore-backup-with-mode', backupPath, mode),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  verifyBackup: (filePath: string) => ipcRenderer.invoke('verify-backup', filePath),
  previewBackup: (filePath: string) => ipcRenderer.invoke('preview-backup', filePath),

  // TOTP
  setupTotp: () => ipcRenderer.invoke('setup-totp'),
  enableTotp: (secret: string, recoveryCodes: string[]) =>
    ipcRenderer.invoke('enable-totp', secret, recoveryCodes),
  verifyTotp: (code: string) => ipcRenderer.invoke('verify-totp', code),
  verifyRecoveryCode: (code: string) => ipcRenderer.invoke('verify-recovery-code', code),
  disableTotp: () => ipcRenderer.invoke('disable-totp'),
  isTotpEnabled: () => ipcRenderer.invoke('is-totp-enabled'),

  // 二维码分享
  createShareQR: (entryId: string, ttl: number) =>
    ipcRenderer.invoke('create-share-qr', entryId, ttl),
  destroyShare: (sessionId: string) => ipcRenderer.invoke('destroy-share', sessionId),
  getShareRemainingTime: (sessionId: string) => ipcRenderer.invoke('get-share-remaining-time', sessionId),

  // 剪贴板
  copyToClipboard: (text: string, clearAfter: number) =>
    ipcRenderer.invoke('copy-to-clipboard', text, clearAfter),

  // 自动锁定
  setAutoLockTimeout: (minutes: number) =>
    ipcRenderer.invoke('set-auto-lock-timeout', minutes),
  getAutoLockTimeout: () => ipcRenderer.invoke('get-auto-lock-timeout'),
  resetIdleTimer: () => ipcRenderer.invoke('reset-idle-timer'),
  onVaultLocked: (callback: () => void) => {
    ipcRenderer.on('vault-locked', callback);
    return () => ipcRenderer.removeListener('vault-locked', callback);
  },

  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  windowSetAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window-set-always-on-top', flag),
  windowIsAlwaysOnTop: () => ipcRenderer.invoke('window-is-always-on-top'),

  // 文件对话框
  showOpenDialog: (options: unknown) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: unknown) => ipcRenderer.invoke('show-save-dialog', options),

  // 云同步
  syncBindQuark: () => ipcRenderer.invoke('sync:bind-quark'),
  syncUnbindQuark: () => ipcRenderer.invoke('sync:unbind-quark'),
  syncGetAuthState: () => ipcRenderer.invoke('sync:get-auth-state'),
  syncBindWithCookie: (cookie: string) => ipcRenderer.invoke('sync:bind-with-cookie', cookie),
  syncUpload: () => ipcRenderer.invoke('sync:upload'),
  syncDownload: () => ipcRenderer.invoke('sync:download'),
  syncConfirmRestore: (masterPassword: string) => ipcRenderer.invoke('sync:confirm-restore', masterPassword),
  syncGetInfo: () => ipcRenderer.invoke('sync:get-info'),
  syncGetConfig: () => ipcRenderer.invoke('sync:get-config'),
  syncSetConfig: (config: unknown) => ipcRenderer.invoke('sync:set-config', config),
  syncExportFile: () => ipcRenderer.invoke('sync:export-file'),
  syncImportFile: () => ipcRenderer.invoke('sync:import-file'),
  syncClearCloudData: () => ipcRenderer.invoke('sync:clear-cloud-data'),
  syncHasUnsyncedChanges: () => ipcRenderer.invoke('sync:has-unsynced-changes'),
  syncMarkLocalChanged: () => ipcRenderer.invoke('sync:mark-local-changed'),

  // 智能图标
  getSmartIcon: (title: string, url?: string) => ipcRenderer.invoke('get-smart-icon', title, url),
  matchIconByKeyword: (title: string, url?: string) => ipcRenderer.invoke('match-icon-by-keyword', title, url),

  // 快捷键设置
  shortcutGetConfig: () => ipcRenderer.invoke('shortcut:get-config'),
  shortcutUpdate: (action: string, accelerator: string) => ipcRenderer.invoke('shortcut:update', action, accelerator),
  shortcutValidate: (accelerator: string) => ipcRenderer.invoke('shortcut:validate', accelerator),
  shortcutSetEnabled: (enabled: boolean) => ipcRenderer.invoke('shortcut:set-enabled', enabled),
  shortcutReset: () => ipcRenderer.invoke('shortcut:reset'),

  // OCR 设置
  ocrInitialize: () => ipcRenderer.invoke('ocr:initialize'),
  ocrSetLanguage: (lang: string) => ipcRenderer.invoke('ocr:set-language', lang),
  ocrGetLanguage: () => ipcRenderer.invoke('ocr:get-language'),
  ocrIsReady: () => ipcRenderer.invoke('ocr:is-ready'),
  ocrRecognizeClipboard: () => ipcRenderer.invoke('ocr:recognize-clipboard'),
  ocrRecognizeFile: (filePath: string) => ipcRenderer.invoke('ocr:recognize-file', filePath),

  // 快速录入
  quickEntryShow: () => ipcRenderer.invoke('quick-entry:show'),
  quickEntryHide: () => ipcRenderer.invoke('quick-entry:hide'),
  quickEntryClose: () => ipcRenderer.invoke('quick-entry:close'),

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
