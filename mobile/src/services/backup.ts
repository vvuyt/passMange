/**
 * 备份与恢复服务
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  query,
  execute,
  queryOne,
  getDatabase,
} from './database';
import {
  getDerivedKey,
  encryptObject,
  decryptObject,
  sha256,
} from '../utils/crypto';
import { PasswordEntry, Category, Tag, EncryptedData } from '../types/models';
import { listEntries, listCategories, listTags } from './vault';

const BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  data: {
    entries: PasswordEntry[];
    categories: Category[];
    tags: Tag[];
  };
  checksum: string;
}

interface EncryptedBackup {
  version: number;
  createdAt: string;
  encrypted: EncryptedData;
  checksum: string;
}

/**
 * 创建加密备份
 */
export async function createBackup(): Promise<string> {
  const key = getDerivedKey();
  
  // 获取所有数据
  const entries = await listEntries();
  const categories = await listCategories();
  const tags = await listTags();

  const backupData: BackupData = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '0.1.0',
    data: {
      entries,
      categories,
      tags,
    },
    checksum: '',
  };

  // 计算校验和
  backupData.checksum = sha256(JSON.stringify(backupData.data));

  // 加密备份数据
  const encrypted = encryptObject(backupData, key);

  const encryptedBackup: EncryptedBackup = {
    version: BACKUP_VERSION,
    createdAt: backupData.createdAt,
    encrypted,
    checksum: backupData.checksum,
  };

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `password-manager-backup-${timestamp}.json`;
  
  // 保存到文档目录
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, JSON.stringify(encryptedBackup, null, 2), 'utf8');

  return path;
}

/**
 * 分享备份文件
 */
export async function shareBackup(filePath: string): Promise<void> {
  await Share.open({
    url: `file://${filePath}`,
    type: 'application/json',
    title: '分享密码库备份',
  });
}

/**
 * 验证备份文件
 */
export async function verifyBackup(filePath: string): Promise<{
  valid: boolean;
  info?: {
    createdAt: string;
    entriesCount: number;
    categoriesCount: number;
  };
  error?: string;
}> {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    const backup: EncryptedBackup = JSON.parse(content);

    if (!backup.version || !backup.encrypted) {
      return { valid: false, error: '无效的备份文件格式' };
    }

    // 尝试解密
    const key = getDerivedKey();
    const decrypted = decryptObject<BackupData>(backup.encrypted, key);

    // 验证校验和
    const checksum = sha256(JSON.stringify(decrypted.data));
    if (checksum !== decrypted.checksum) {
      return { valid: false, error: '备份文件已损坏' };
    }

    return {
      valid: true,
      info: {
        createdAt: decrypted.createdAt,
        entriesCount: decrypted.data.entries.length,
        categoriesCount: decrypted.data.categories.length,
      },
    };
  } catch (error) {
    return { valid: false, error: '无法读取或解密备份文件' };
  }
}

/**
 * 恢复备份
 */
export async function restoreBackup(
  filePath: string,
  mode: 'overwrite' | 'merge' = 'merge'
): Promise<{
  success: boolean;
  added?: number;
  skipped?: number;
  error?: string;
}> {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    const backup: EncryptedBackup = JSON.parse(content);

    const key = getDerivedKey();
    const decrypted = decryptObject<BackupData>(backup.encrypted, key);

    // 验证校验和
    const checksum = sha256(JSON.stringify(decrypted.data));
    if (checksum !== decrypted.checksum) {
      return { success: false, error: '备份文件已损坏' };
    }

    let added = 0;
    let skipped = 0;

    if (mode === 'overwrite') {
      // 清空现有数据
      await execute('DELETE FROM entry_tags');
      await execute('DELETE FROM password_entries');
      await execute('DELETE FROM tags');
      await execute('DELETE FROM categories WHERE is_default = 0');
    }

    // 恢复分类
    for (const category of decrypted.data.categories) {
      if (!category.isDefault) {
        const existing = await queryOne(
          'SELECT id FROM categories WHERE id = ?',
          [category.id]
        );
        if (!existing) {
          await execute(
            `INSERT INTO categories (id, name, icon, color, sort_order, is_default, created_at)
             VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [category.id, category.name, category.icon, category.color, category.sortOrder, new Date().toISOString()]
          );
        }
      }
    }

    // 恢复标签
    for (const tag of decrypted.data.tags) {
      const existing = await queryOne(
        'SELECT id FROM tags WHERE id = ?',
        [tag.id]
      );
      if (!existing) {
        await execute(
          'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
          [tag.id, tag.name, tag.color, new Date().toISOString()]
        );
      }
    }

    // 恢复密码条目
    for (const entry of decrypted.data.entries) {
      const existing = await queryOne(
        'SELECT id FROM password_entries WHERE id = ?',
        [entry.id]
      );

      if (existing && mode === 'merge') {
        skipped++;
        continue;
      }

      // 重新加密数据
      const encryptedData = encryptObject(
        {
          title: entry.title,
          username: entry.username,
          password: entry.password,
          url: entry.url,
          notes: entry.notes,
          icon: entry.icon,
        },
        key
      );

      if (existing) {
        await execute(
          `UPDATE password_entries SET encrypted_data = ?, category_id = ?, favorite = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(encryptedData), entry.categoryId, entry.favorite ? 1 : 0, new Date().toISOString(), entry.id]
        );
      } else {
        await execute(
          `INSERT INTO password_entries (id, encrypted_data, category_id, favorite, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [entry.id, JSON.stringify(encryptedData), entry.categoryId, entry.favorite ? 1 : 0, entry.createdAt, entry.updatedAt]
        );
      }

      // 恢复标签关联
      await execute('DELETE FROM entry_tags WHERE entry_id = ?', [entry.id]);
      for (const tagId of entry.tags) {
        await execute(
          'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
          [entry.id, tagId]
        );
      }

      added++;
    }

    return { success: true, added, skipped };
  } catch (error) {
    console.error('Restore backup failed:', error);
    return { success: false, error: '恢复失败' };
  }
}

/**
 * 导出为 CSV（明文，用于迁移到其他密码管理器）
 */
export async function exportToCSV(): Promise<string> {
  const entries = await listEntries();
  const categories = await listCategories();

  const getCategoryName = (id?: string) => {
    if (!id) return '';
    const cat = categories.find(c => c.id === id);
    return cat?.name || '';
  };

  // CSV 头
  const headers = ['title', 'username', 'password', 'url', 'notes', 'category'];
  const rows = entries.map(entry => [
    escapeCSV(entry.title),
    escapeCSV(entry.username),
    escapeCSV(entry.password),
    escapeCSV(entry.url || ''),
    escapeCSV(entry.notes || ''),
    escapeCSV(getCategoryName(entry.categoryId)),
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `passwords-export-${timestamp}.csv`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  
  await RNFS.writeFile(path, csv, 'utf8');
  return path;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 获取备份文件列表
 */
export async function listBackups(): Promise<Array<{
  name: string;
  path: string;
  size: number;
  createdAt: Date;
}>> {
  const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
  
  return files
    .filter(f => f.name.startsWith('password-manager-backup-') && f.name.endsWith('.json'))
    .map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      createdAt: new Date(f.mtime || f.ctime || Date.now()),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 删除备份文件
 */
export async function deleteBackup(filePath: string): Promise<void> {
  await RNFS.unlink(filePath);
}
