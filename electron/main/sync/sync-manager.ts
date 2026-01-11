/**
 * 同步管理器
 * 负责云盘同步的核心逻辑
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import { getSyncAuthManager, SyncAuthManager } from './auth';
import { QuarkClient } from './quark-api';
import { SyncConfig, SyncInfo, SyncStatus, UploadResult, DownloadResult, RestoreResult } from './types';
import { getDatabase, saveDatabase, initDatabase } from '../storage/db';
import { verifyBackup, restoreBackup as restoreFromBackup } from '../backup';

// 日志文件路径
const LOG_FILE = path.join(app.getPath('userData'), 'sync.log');

function log(...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  fs.appendFileSync(LOG_FILE, message);
  console.log(...args);
}

// 备份文件魔数（与backup模块一致）
const BACKUP_MAGIC = 'PWMGR_BACKUP_V1';

// 同步文件名
const SYNC_FILE_NAME = 'password_vault_sync.pwbak';

// 配置文件名
const CONFIG_FILE = 'sync_config.json';

// 默认配置
const DEFAULT_CONFIG: SyncConfig = {
  enabled: true,
  cloudFolderPath: '/密码管理器',
  cloudFolderId: '',
  checkOnStartup: false,
  remindOnExit: true,
};

export class SyncManager {
  private authManager: SyncAuthManager;
  private config: SyncConfig;
  private configPath: string;
  private localChanged: boolean = false;
  private lastSyncTime: string | null = null;
  private cloudFileId: string | null = null;
  private localVersion: number = 0;
  private pendingDownloadData: Buffer | null = null;

  constructor() {
    this.authManager = getSyncAuthManager();
    this.configPath = path.join(app.getPath('userData'), CONFIG_FILE);
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): SyncConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const saved = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...saved };
      }
    } catch {
      // 忽略错误，使用默认配置
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 创建同步数据包（复用备份格式）
   */
  private createSyncPackage(): Buffer {
    const db = getDatabase();
    const dbData = db.export();
    const dbBuffer = Buffer.from(dbData);
    
    // 备份文件结构: MAGIC + checksum(64) + data
    const checksum = this.calculateChecksum(dbBuffer);
    const header = Buffer.from(BACKUP_MAGIC + checksum);
    
    return Buffer.concat([header, dbBuffer]);
  }

  /**
   * 验证同步数据包
   */
  private verifySyncPackage(data: Buffer): { valid: boolean; error?: string } {
    try {
      // 检查魔数
      const magic = data.slice(0, BACKUP_MAGIC.length).toString();
      if (magic !== BACKUP_MAGIC) {
        return { valid: false, error: '无效的同步数据格式' };
      }
      
      // 提取校验和
      const storedChecksum = data.slice(BACKUP_MAGIC.length, BACKUP_MAGIC.length + 64).toString();
      
      // 提取数据并验证校验和
      const dbData = data.slice(BACKUP_MAGIC.length + 64);
      const calculatedChecksum = this.calculateChecksum(dbData);
      
      if (storedChecksum !== calculatedChecksum) {
        return { valid: false, error: '同步数据已损坏或被篡改' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `验证失败: ${(error as Error).message}` };
    }
  }

  /**
   * 绑定夸克云盘
   */
  async bindQuarkCloud(): Promise<{ success: boolean; nickname?: string; error?: string }> {
    return this.authManager.bind();
  }

  /**
   * 解绑夸克云盘
   */
  async unbindQuarkCloud(): Promise<void> {
    await this.authManager.unbind();
    this.cloudFileId = null;
    this.lastSyncTime = null;
  }

  /**
   * 上传到云盘
   */
  async uploadToCloud(onProgress?: (percent: number) => void): Promise<UploadResult> {
    try {
      // 获取客户端
      const client = await this.authManager.getClient();
      if (!client) {
        return { success: false, error: '未绑定夸克云盘' };
      }

      // 创建同步数据包
      onProgress?.(10);
      const syncData = this.createSyncPackage();
      
      // 确保云端文件夹存在
      onProgress?.(20);
      if (!this.config.cloudFolderId) {
        this.config.cloudFolderId = await client.findOrCreateFolder(this.config.cloudFolderPath);
        this.saveConfig();
      }

      // 删除旧的同步文件（如果存在）
      onProgress?.(30);
      try {
        const files = await client.listFiles(this.config.cloudFolderId);
        const existingFile = files.find(f => f.fileName === SYNC_FILE_NAME);
        if (existingFile) {
          await client.deleteFile(existingFile.fid);
        }
      } catch {
        // 忽略删除错误
      }

      // 上传新文件
      const fileId = await client.uploadFile(
        SYNC_FILE_NAME,
        syncData,
        this.config.cloudFolderId,
        (percent) => onProgress?.(30 + percent * 0.6)
      );

      // 更新状态
      this.cloudFileId = fileId;
      this.lastSyncTime = new Date().toISOString();
      this.localChanged = false;
      this.localVersion++;

      onProgress?.(100);
      return { success: true, fileId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '上传失败' 
      };
    }
  }

  /**
   * 从云盘下载
   */
  async downloadFromCloud(): Promise<DownloadResult> {
    try {
      // 获取客户端
      const client = await this.authManager.getClient();
      if (!client) {
        return { success: false, error: '未绑定夸克云盘' };
      }

      // 确保云端文件夹存在
      if (!this.config.cloudFolderId) {
        this.config.cloudFolderId = await client.findOrCreateFolder(this.config.cloudFolderPath);
        this.saveConfig();
      }

      // 查找同步文件
      log('[Sync] 查找云端文件夹:', this.config.cloudFolderId);
      const files = await client.listFiles(this.config.cloudFolderId);
      log('[Sync] 云端文件列表:', files.map(f => f.fileName));
      
      const syncFile = files.find(f => f.fileName === SYNC_FILE_NAME);
      
      if (!syncFile) {
        return { success: false, error: '云端没有同步数据' };
      }

      log('[Sync] 找到同步文件:', syncFile.fid, syncFile.fileName, syncFile.fileSize);

      // 下载文件
      log('[Sync] 开始下载文件...');
      const data = await client.downloadFile(syncFile.fid);
      log('[Sync] 下载完成, 大小:', data.length);

      // 验证数据完整性
      const verification = this.verifySyncPackage(data);
      if (!verification.valid) {
        log('[Sync] 数据验证失败:', verification.error);
        return { success: false, error: verification.error };
      }

      log('[Sync] 数据验证通过');

      // 保存待恢复的数据
      this.pendingDownloadData = data;

      return { 
        success: true, 
        data,
        needsConfirm: true,
        needsRestore: true
      };
    } catch (error) {
      log('[Sync] 下载失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '下载失败' 
      };
    }
  }

  /**
   * 确认恢复（覆盖本地数据）
   */
  async confirmRestore(masterPassword: string): Promise<RestoreResult> {
    try {
      if (!this.pendingDownloadData) {
        return { success: false, error: '没有待恢复的数据' };
      }

      // 提取数据库数据
      const dbData = this.pendingDownloadData.slice(BACKUP_MAGIC.length + 64);
      
      // 保存到临时文件
      const tempPath = path.join(app.getPath('userData'), 'temp_restore.pwbak');
      fs.writeFileSync(tempPath, this.pendingDownloadData);

      try {
        // 使用备份模块恢复
        await restoreFromBackup(tempPath, 'overwrite');
        
        // 恢复后需要用主密码重新解锁
        const { unlockVault } = require('../storage/vault');
        const unlocked = unlockVault(masterPassword);
        
        if (!unlocked) {
          return { success: false, error: '主密码错误，无法解锁恢复的数据' };
        }
        
        // 更新状态
        this.lastSyncTime = new Date().toISOString();
        this.localChanged = false;
        this.pendingDownloadData = null;

        return { success: true };
      } finally {
        // 清理临时文件
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '恢复失败' 
      };
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncInfo(): Promise<SyncInfo> {
    const authState = await this.authManager.getAuthState();
    
    let status: SyncStatus = 'not_connected';
    if (authState.isAuthenticated) {
      status = this.localChanged ? 'pending_upload' : 'synced';
    }

    return {
      status,
      lastSyncTime: this.lastSyncTime || undefined,
      cloudFileId: this.cloudFileId || undefined,
      localVersion: this.localVersion,
      isAuthenticated: authState.isAuthenticated,
      nickname: authState.nickname,
    };
  }

  /**
   * 标记本地数据已变更
   */
  markLocalChanged(): void {
    this.localChanged = true;
  }

  /**
   * 检查是否有未同步的更改
   */
  hasUnsyncedChanges(): boolean {
    return this.localChanged;
  }

  /**
   * 导出同步文件到本地
   */
  async exportSyncFile(savePath: string): Promise<void> {
    const syncData = this.createSyncPackage();
    fs.writeFileSync(savePath, syncData);
  }

  /**
   * 从本地文件导入
   */
  async importSyncFile(filePath: string): Promise<RestoreResult> {
    try {
      // 读取文件
      const data = fs.readFileSync(filePath);

      // 验证数据完整性
      const verification = this.verifySyncPackage(data);
      if (!verification.valid) {
        return { success: false, error: verification.error };
      }

      // 使用备份模块恢复
      await restoreFromBackup(filePath, 'overwrite');

      // 更新状态
      this.localChanged = false;

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '导入失败' 
      };
    }
  }

  /**
   * 获取配置
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  /**
   * 清除云端数据
   */
  async clearCloudData(): Promise<void> {
    const client = await this.authManager.getClient();
    if (!client) {
      throw new Error('未绑定夸克云盘');
    }

    if (this.config.cloudFolderId) {
      try {
        const files = await client.listFiles(this.config.cloudFolderId);
        const syncFile = files.find(f => f.fileName === SYNC_FILE_NAME);
        if (syncFile) {
          await client.deleteFile(syncFile.fid);
        }
      } catch {
        // 忽略删除错误
      }
    }

    this.cloudFileId = null;
  }
}

// 单例实例
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}
