/**
 * 备份模块
 * 支持创建、恢复和管理加密备份
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase, execute, query, initDatabase } from '../storage/db';
import { BackupInfo } from '../storage/models';
import initSqlJs from 'sql.js';

// 备份文件魔数
const BACKUP_MAGIC = 'PWMGR_BACKUP_V1';

// 备份预览数据接口
export interface BackupPreviewData {
  entriesCount: number;
  categoriesCount: number;
  tagsCount: number;
  entries: Array<{ title: string; username: string; url?: string }>;
  categories: Array<{ name: string; icon?: string }>;
  createdAt?: string;
}

/**
 * 获取备份目录
 */
function getBackupDir(): string {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * 计算文件校验和
 */
function calculateChecksum(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 创建备份
 */
export async function createBackup(backupType: 'manual' | 'auto' = 'manual'): Promise<BackupInfo> {
  const db = getDatabase();
  
  // 导出数据库
  const dbData = db.export();
  const dbBuffer = Buffer.from(dbData);
  
  // 创建备份数据包
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = uuidv4();
  
  // 备份文件结构: MAGIC + checksum(32) + data
  const checksum = calculateChecksum(dbBuffer);
  const header = Buffer.from(BACKUP_MAGIC + checksum);
  const backupData = Buffer.concat([header, dbBuffer]);
  
  // 保存备份文件
  const fileName = `backup_${timestamp}_${backupType}.pwbak`;
  let filePath: string;
  
  if (backupType === 'manual') {
    // 手动备份：弹出保存对话框
    const result = await dialog.showSaveDialog({
      title: '保存备份文件',
      defaultPath: path.join(app.getPath('downloads'), fileName),
      filters: [{ name: '密码管理器备份', extensions: ['pwbak'] }],
    });
    
    if (result.canceled || !result.filePath) {
      throw new Error('用户取消了备份');
    }
    filePath = result.filePath;
  } else {
    // 自动备份：保存到备份目录
    filePath = path.join(getBackupDir(), fileName);
  }
  
  fs.writeFileSync(filePath, backupData);
  
  // 记录备份信息
  const backupInfo: BackupInfo = {
    id: backupId,
    filePath,
    fileSize: backupData.length,
    checksum,
    createdAt: new Date().toISOString(),
    backupType,
  };
  
  // 保存到数据库
  execute(
    `INSERT INTO backups (id, file_path, file_size, checksum, created_at, backup_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [backupInfo.id, backupInfo.filePath, backupInfo.fileSize, backupInfo.checksum, backupInfo.createdAt, backupInfo.backupType]
  );
  
  return backupInfo;
}

/**
 * 验证备份文件完整性
 */
export function verifyBackup(filePath: string): { valid: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: '备份文件不存在' };
    }
    
    const data = fs.readFileSync(filePath);
    
    // 检查魔数
    const magic = data.slice(0, BACKUP_MAGIC.length).toString();
    if (magic !== BACKUP_MAGIC) {
      return { valid: false, error: '无效的备份文件格式' };
    }
    
    // 提取校验和
    const storedChecksum = data.slice(BACKUP_MAGIC.length, BACKUP_MAGIC.length + 64).toString();
    
    // 提取数据并验证校验和
    const dbData = data.slice(BACKUP_MAGIC.length + 64);
    const calculatedChecksum = calculateChecksum(dbData);
    
    if (storedChecksum !== calculatedChecksum) {
      return { valid: false, error: '备份文件已损坏或被篡改' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `验证失败: ${(error as Error).message}` };
  }
}

/**
 * 预览备份内容
 */
export async function previewBackup(filePath: string): Promise<BackupPreviewData> {
  // 先验证备份
  const verification = verifyBackup(filePath);
  if (!verification.valid) {
    throw new Error(verification.error || '备份验证失败');
  }
  
  // 读取备份数据
  const data = fs.readFileSync(filePath);
  const dbData = data.slice(BACKUP_MAGIC.length + 64);
  
  // 使用 sql.js 打开备份数据库
  const SQL = await initSqlJs();
  const backupDb = new SQL.Database(dbData);
  
  try {
    // 查询条目数量和列表
    const entriesResult = backupDb.exec('SELECT title, username, url FROM password_entries LIMIT 100');
    const entries = entriesResult.length > 0 
      ? entriesResult[0].values.map(row => ({
          title: row[0] as string,
          username: row[1] as string,
          url: row[2] as string | undefined,
        }))
      : [];
    
    const entriesCountResult = backupDb.exec('SELECT COUNT(*) FROM password_entries');
    const entriesCount = entriesCountResult.length > 0 ? Number(entriesCountResult[0].values[0][0]) : 0;
    
    // 查询分类
    const categoriesResult = backupDb.exec('SELECT name, icon FROM categories');
    const categories = categoriesResult.length > 0
      ? categoriesResult[0].values.map(row => ({
          name: row[0] as string,
          icon: row[1] as string | undefined,
        }))
      : [];
    
    // 查询标签数量
    const tagsCountResult = backupDb.exec('SELECT COUNT(*) FROM tags');
    const tagsCount = tagsCountResult.length > 0 ? Number(tagsCountResult[0].values[0][0]) : 0;
    
    // 获取备份创建时间
    const metaResult = backupDb.exec("SELECT value FROM vault_meta WHERE key = 'last_backup'");
    const createdAt = metaResult.length > 0 ? metaResult[0].values[0][0] as string : undefined;
    
    return {
      entriesCount,
      categoriesCount: categories.length,
      tagsCount,
      entries,
      categories,
      createdAt,
    };
  } finally {
    backupDb.close();
  }
}

/**
 * 恢复备份
 * @param backupPath 备份文件路径
 * @param mode 恢复模式: 'overwrite' 覆盖, 'merge' 增量合并
 */
export async function restoreBackup(backupPath?: string, mode: 'overwrite' | 'merge' = 'overwrite'): Promise<{ added: number; skipped: number }> {
  let filePath = backupPath;
  
  // 如果没有指定路径，弹出选择对话框
  if (!filePath) {
    const result = await dialog.showOpenDialog({
      title: '选择备份文件',
      filters: [{ name: '密码管理器备份', extensions: ['pwbak'] }],
      properties: ['openFile'],
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      throw new Error('用户取消了恢复');
    }
    filePath = result.filePaths[0];
  }
  
  // 验证备份
  const verification = verifyBackup(filePath);
  if (!verification.valid) {
    throw new Error(verification.error || '备份验证失败');
  }
  
  // 读取备份数据
  const data = fs.readFileSync(filePath);
  const dbData = data.slice(BACKUP_MAGIC.length + 64);
  
  if (mode === 'overwrite') {
    // 覆盖模式：直接替换数据库
    const currentDbPath = path.join(app.getPath('userData'), 'vault.db');
    if (fs.existsSync(currentDbPath)) {
      const backupCurrentPath = currentDbPath + '.before_restore';
      fs.copyFileSync(currentDbPath, backupCurrentPath);
    }
    
    fs.writeFileSync(currentDbPath, dbData);
    
    // 重新初始化数据库
    await initDatabase();
    
    return { added: 0, skipped: 0 };
  } else {
    // 增量模式：合并数据
    const SQL = await initSqlJs();
    const backupDb = new SQL.Database(dbData);
    
    let added = 0;
    let skipped = 0;
    
    try {
      // 获取备份中的所有条目
      const entriesResult = backupDb.exec(`
        SELECT id, title, username, password, url, notes, category_id, icon, favorite, created_at, updated_at 
        FROM password_entries
      `);
      
      if (entriesResult.length > 0) {
        const columns = ['id', 'title', 'username', 'password', 'url', 'notes', 'category_id', 'icon', 'favorite', 'created_at', 'updated_at'];
        
        for (const row of entriesResult[0].values) {
          const entry: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            entry[col] = row[i];
          });
          
          // 检查是否已存在（按标题和用户名判断）
          const existing = query<{ id: string }>(
            'SELECT id FROM password_entries WHERE title = ? AND username = ?',
            [entry.title as string, entry.username as string]
          );
          
          if (existing.length === 0) {
            // 不存在，插入新条目
            execute(
              `INSERT INTO password_entries (id, title, username, password, url, notes, category_id, icon, favorite, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(), // 使用新 ID
                entry.title,
                entry.username,
                entry.password,
                entry.url,
                entry.notes,
                entry.category_id,
                entry.icon,
                entry.favorite,
                entry.created_at,
                entry.updated_at,
              ]
            );
            added++;
          } else {
            skipped++;
          }
        }
      }
      
      // 合并分类（如果不存在则添加）
      const categoriesResult = backupDb.exec('SELECT name, icon, color, sort_order, is_default FROM categories');
      if (categoriesResult.length > 0) {
        for (const row of categoriesResult[0].values) {
          const [name, icon, color, sortOrder, isDefault] = row;
          const existing = query<{ id: string }>('SELECT id FROM categories WHERE name = ?', [name as string]);
          if (existing.length === 0) {
            execute(
              'INSERT INTO categories (id, name, icon, color, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?)',
              [uuidv4(), name, icon, color, sortOrder, isDefault]
            );
          }
        }
      }
      
      // 合并标签（如果不存在则添加）
      const tagsResult = backupDb.exec('SELECT name, color FROM tags');
      if (tagsResult.length > 0) {
        for (const row of tagsResult[0].values) {
          const [name, color] = row;
          const existing = query<{ id: string }>('SELECT id FROM tags WHERE name = ?', [name as string]);
          if (existing.length === 0) {
            execute(
              'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
              [uuidv4(), name, color]
            );
          }
        }
      }
      
      // 保存数据库
      saveDatabase();
      
      return { added, skipped };
    } finally {
      backupDb.close();
    }
  }
}

/**
 * 列出所有备份
 */
export function listBackups(): BackupInfo[] {
  const rows = query<{
    id: string;
    file_path: string;
    file_size: number;
    checksum: string;
    created_at: string;
    backup_type: string;
  }>('SELECT * FROM backups ORDER BY created_at DESC');
  
  return rows.map(row => ({
    id: row.id,
    filePath: row.file_path,
    fileSize: row.file_size,
    checksum: row.checksum,
    createdAt: row.created_at,
    backupType: row.backup_type as 'manual' | 'auto',
  })).filter(backup => {
    // 过滤掉已删除的备份文件
    return fs.existsSync(backup.filePath);
  });
}

/**
 * 删除备份
 */
export function deleteBackup(backupId: string): void {
  const backup = query<{ file_path: string }>(
    'SELECT file_path FROM backups WHERE id = ?',
    [backupId]
  )[0];
  
  if (backup && fs.existsSync(backup.file_path)) {
    fs.unlinkSync(backup.file_path);
  }
  
  execute('DELETE FROM backups WHERE id = ?', [backupId]);
}

/**
 * 清理旧备份（保留指定数量）
 */
export function cleanupOldBackups(keepCount: number = 5): number {
  const backups = listBackups().filter(b => b.backupType === 'auto');
  
  if (backups.length <= keepCount) {
    return 0;
  }
  
  // 按时间排序，删除最旧的
  const toDelete = backups.slice(keepCount);
  let deleted = 0;
  
  for (const backup of toDelete) {
    try {
      deleteBackup(backup.id);
      deleted++;
    } catch {
      // 忽略删除失败
    }
  }
  
  return deleted;
}

/**
 * 导出为便携格式（JSON）
 */
export async function exportPortable(): Promise<void> {
  const { listEntries } = require('../storage/entries');
  const { listCategories } = require('../storage/categories');
  const { listTags } = require('../storage/tags');
  
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: listEntries(),
    categories: listCategories(),
    tags: listTags(),
  };
  
  const result = await dialog.showSaveDialog({
    title: '导出数据',
    defaultPath: path.join(app.getPath('downloads'), `password_export_${Date.now()}.json`),
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
  });
  
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
