/**
 * 云同步服务
 * 使用夸克网盘进行数据同步
 */

import { MMKV } from 'react-native-mmkv';
import { QuarkClient } from '../lib/quark';
import {
  getDerivedKey,
  encryptObject,
  decryptObject,
  sha256,
} from '../utils/crypto';
import { PasswordEntry, Category, Tag, EncryptedData } from '../types/models';
import { listEntries, listCategories, listTags } from './vault';
import { query, execute, queryOne } from './database';

const storage = new MMKV({ id: 'sync-storage' });

// 存储键
const KEYS = {
  COOKIE: 'quark_cookie_encrypted',
  FOLDER_ID: 'quark_folder_id',
  LAST_SYNC: 'last_sync_time',
  LOCAL_VERSION: 'local_version',
  CLOUD_FILE_ID: 'cloud_file_id',
  NICKNAME: 'quark_nickname',
};

// 同步文件名
const SYNC_FILE_NAME = 'password-manager-sync.dat';
const SYNC_FOLDER_PATH = '我的应用数据/密码管理器';

// 同步数据结构
interface SyncData {
  version: number;
  updatedAt: string;
  data: {
    entries: PasswordEntry[];
    categories: Category[];
    tags: Tag[];
  };
  checksum: string;
}

// 同步状态
export interface SyncStatus {
  isAuthenticated: boolean;
  nickname?: string;
  lastSyncTime?: string;
  localVersion: number;
  cloudVersion?: number;
  hasUnsyncedChanges: boolean;
}

/**
 * 保存加密的 Cookie
 */
export async function saveCookie(cookie: string): Promise<void> {
  const key = getDerivedKey();
  const encrypted = encryptObject({ cookie }, key);
  storage.set(KEYS.COOKIE, JSON.stringify(encrypted));
}

/**
 * 获取 Cookie
 */
export function getCookie(): string | null {
  const data = storage.getString(KEYS.COOKIE);
  if (!data) return null;
  
  try {
    const key = getDerivedKey();
    const encrypted: EncryptedData = JSON.parse(data);
    const decrypted = decryptObject<{ cookie: string }>(encrypted, key);
    return decrypted.cookie;
  } catch {
    return null;
  }
}

/**
 * 清除 Cookie
 */
export function clearCookie(): void {
  storage.delete(KEYS.COOKIE);
  storage.delete(KEYS.FOLDER_ID);
  storage.delete(KEYS.NICKNAME);
  storage.delete(KEYS.CLOUD_FILE_ID);
}

/**
 * 获取 QuarkClient 实例
 */
export function getQuarkClient(): QuarkClient | null {
  const cookie = getCookie();
  if (!cookie) return null;
  return new QuarkClient(cookie);
}

/**
 * 绑定夸克网盘（使用 Cookie）
 */
export async function bindWithCookie(cookie: string): Promise<{
  success: boolean;
  nickname?: string;
  error?: string;
}> {
  try {
    const client = new QuarkClient(cookie.trim());
    const result = await client.validateCookie();
    
    if (!result.valid) {
      return { success: false, error: 'Cookie 无效或已过期' };
    }

    await saveCookie(cookie.trim());
    storage.set(KEYS.NICKNAME, result.nickname || '夸克用户');
    
    return { success: true, nickname: result.nickname };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '绑定失败'
    };
  }
}

/**
 * 解绑夸克网盘
 */
export function unbind(): void {
  clearCookie();
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const cookie = getCookie();
  const localVersion = storage.getNumber(KEYS.LOCAL_VERSION) || 0;
  const lastSyncTime = storage.getString(KEYS.LAST_SYNC);
  const nickname = storage.getString(KEYS.NICKNAME);
  
  if (!cookie) {
    return {
      isAuthenticated: false,
      localVersion,
      hasUnsyncedChanges: localVersion > 0,
    };
  }

  // 验证 Cookie 是否仍然有效
  const client = new QuarkClient(cookie);
  const result = await client.validateCookie();
  
  if (!result.valid) {
    return {
      isAuthenticated: false,
      localVersion,
      hasUnsyncedChanges: localVersion > 0,
    };
  }

  return {
    isAuthenticated: true,
    nickname: nickname || result.nickname,
    lastSyncTime,
    localVersion,
    hasUnsyncedChanges: localVersion > 0,
  };
}

/**
 * 标记本地有更改
 */
export function markLocalChanged(): void {
  const current = storage.getNumber(KEYS.LOCAL_VERSION) || 0;
  storage.set(KEYS.LOCAL_VERSION, current + 1);
}

/**
 * 上传同步数据
 */
export async function uploadSync(
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; error?: string }> {
  const client = getQuarkClient();
  if (!client) {
    return { success: false, error: '未绑定夸克网盘' };
  }

  try {
    onProgress?.(5);
    
    // 获取所有数据
    const entries = await listEntries();
    const categories = await listCategories();
    const tags = await listTags();

    const syncData: SyncData = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      data: { entries, categories, tags },
      checksum: '',
    };
    syncData.checksum = sha256(JSON.stringify(syncData.data));

    onProgress?.(15);

    // 加密数据
    const key = getDerivedKey();
    const encrypted = encryptObject(syncData, key);
    const content = JSON.stringify(encrypted);
    const dataBuffer = new TextEncoder().encode(content).buffer;

    onProgress?.(25);

    // 确保文件夹存在
    let folderId = storage.getString(KEYS.FOLDER_ID);
    if (!folderId) {
      folderId = await client.findOrCreateFolder(SYNC_FOLDER_PATH);
      storage.set(KEYS.FOLDER_ID, folderId);
    }

    onProgress?.(35);

    // 删除旧文件
    const oldFileId = storage.getString(KEYS.CLOUD_FILE_ID);
    if (oldFileId) {
      try {
        await client.deleteFile(oldFileId);
      } catch {
        // 忽略删除失败
      }
    }

    onProgress?.(45);

    // 上传新文件
    const fileId = await client.uploadFile(
      SYNC_FILE_NAME,
      dataBuffer,
      folderId,
      (p) => onProgress?.(45 + p * 0.5)
    );

    storage.set(KEYS.CLOUD_FILE_ID, fileId);
    storage.set(KEYS.LAST_SYNC, new Date().toISOString());
    storage.set(KEYS.LOCAL_VERSION, 0);

    onProgress?.(100);
    return { success: true };
  } catch (error) {
    console.error('Upload sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

/**
 * 下载同步数据
 */
export async function downloadSync(): Promise<{
  success: boolean;
  data?: SyncData;
  error?: string;
}> {
  const client = getQuarkClient();
  if (!client) {
    return { success: false, error: '未绑定夸克网盘' };
  }

  try {
    // 查找同步文件
    let folderId = storage.getString(KEYS.FOLDER_ID);
    if (!folderId) {
      folderId = await client.findOrCreateFolder(SYNC_FOLDER_PATH);
      storage.set(KEYS.FOLDER_ID, folderId);
    }

    const files = await client.listFiles(folderId);
    const syncFile = files.find(f => f.fileName === SYNC_FILE_NAME);

    if (!syncFile) {
      return { success: false, error: '云端没有同步数据' };
    }

    // 下载文件
    const dataBuffer = await client.downloadFile(syncFile.fid);
    const content = new TextDecoder().decode(dataBuffer);
    const encrypted: EncryptedData = JSON.parse(content);

    // 解密
    const key = getDerivedKey();
    const syncData = decryptObject<SyncData>(encrypted, key);

    // 验证校验和
    const checksum = sha256(JSON.stringify(syncData.data));
    if (checksum !== syncData.checksum) {
      return { success: false, error: '数据校验失败' };
    }

    storage.set(KEYS.CLOUD_FILE_ID, syncFile.fid);
    return { success: true, data: syncData };
  } catch (error) {
    console.error('Download sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载失败'
    };
  }
}

/**
 * 恢复同步数据到本地
 */
export async function restoreFromSync(syncData: SyncData): Promise<{
  success: boolean;
  added?: number;
  error?: string;
}> {
  const key = getDerivedKey();
  let added = 0;

  try {
    // 恢复分类
    for (const category of syncData.data.categories) {
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
    for (const tag of syncData.data.tags) {
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
    for (const entry of syncData.data.entries) {
      const existing = await queryOne(
        'SELECT id FROM password_entries WHERE id = ?',
        [entry.id]
      );

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
          [JSON.stringify(encryptedData), entry.categoryId, entry.favorite ? 1 : 0, entry.updatedAt, entry.id]
        );
      } else {
        await execute(
          `INSERT INTO password_entries (id, encrypted_data, category_id, favorite, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [entry.id, JSON.stringify(encryptedData), entry.categoryId, entry.favorite ? 1 : 0, entry.createdAt, entry.updatedAt]
        );
        added++;
      }

      // 恢复标签关联
      await execute('DELETE FROM entry_tags WHERE entry_id = ?', [entry.id]);
      for (const tagId of entry.tags) {
        await execute(
          'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
          [entry.id, tagId]
        );
      }
    }

    storage.set(KEYS.LAST_SYNC, new Date().toISOString());
    storage.set(KEYS.LOCAL_VERSION, 0);

    return { success: true, added };
  } catch (error) {
    console.error('Restore from sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '恢复失败'
    };
  }
}
