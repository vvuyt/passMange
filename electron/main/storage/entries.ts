/**
 * 密码条目 CRUD 操作
 */

import { v4 as uuidv4 } from 'uuid';
import { execute, query, queryOne, saveDatabase } from './db';
import { PasswordEntry, EncryptedData } from './models';
import { encryptObjectWithSessionKey, decryptObjectWithSessionKey } from '../crypto';

// 加密存储的条目数据（不包含 id、categoryId、favorite、时间戳）
interface EncryptedEntryData {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  icon?: string;
  tags: string[];
}

/**
 * 创建密码条目
 */
export function createEntry(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  // 加密敏感数据
  const dataToEncrypt: EncryptedEntryData = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    icon: entry.icon,
    tags: entry.tags,
  };

  const encryptedData = encryptObjectWithSessionKey(dataToEncrypt);

  execute(
    `INSERT INTO password_entries (id, encrypted_data, category_id, favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, JSON.stringify(encryptedData), entry.categoryId || null, entry.favorite ? 1 : 0, now, now]
  );

  // 保存标签关联
  if (entry.tags && entry.tags.length > 0) {
    for (const tagId of entry.tags) {
      execute(
        `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`,
        [id, tagId]
      );
    }
  }

  return id;
}


/**
 * 获取单个密码条目
 */
export function getEntry(id: string): PasswordEntry | null {
  const row = queryOne<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM password_entries WHERE id = ?', [id]);

  if (!row) return null;

  return decryptEntry(row);
}

/**
 * 获取所有密码条目
 */
export function listEntries(): PasswordEntry[] {
  const rows = query<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM password_entries ORDER BY updated_at DESC');

  return rows.map(decryptEntry);
}

/**
 * 更新密码条目
 */
export function updateEntry(entry: PasswordEntry): void {
  const now = new Date().toISOString();

  // 加密敏感数据
  const dataToEncrypt: EncryptedEntryData = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    icon: entry.icon,
    tags: entry.tags,
  };

  const encryptedData = encryptObjectWithSessionKey(dataToEncrypt);

  execute(
    `UPDATE password_entries 
     SET encrypted_data = ?, category_id = ?, favorite = ?, updated_at = ?
     WHERE id = ?`,
    [JSON.stringify(encryptedData), entry.categoryId || null, entry.favorite ? 1 : 0, now, entry.id]
  );

  // 更新标签关联
  execute('DELETE FROM entry_tags WHERE entry_id = ?', [entry.id]);
  if (entry.tags && entry.tags.length > 0) {
    for (const tagId of entry.tags) {
      execute(
        `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`,
        [entry.id, tagId]
      );
    }
  }
}

/**
 * 删除密码条目
 */
export function deleteEntry(id: string): void {
  execute('DELETE FROM entry_tags WHERE entry_id = ?', [id]);
  execute('DELETE FROM password_entries WHERE id = ?', [id]);
}


/**
 * 搜索密码条目
 */
export function searchEntries(keyword: string): PasswordEntry[] {
  // 获取所有条目并在解密后搜索
  const allEntries = listEntries();
  const lowerKeyword = keyword.toLowerCase();

  return allEntries.filter(entry => 
    entry.title.toLowerCase().includes(lowerKeyword) ||
    entry.username.toLowerCase().includes(lowerKeyword) ||
    (entry.url && entry.url.toLowerCase().includes(lowerKeyword)) ||
    (entry.notes && entry.notes.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * 按分类筛选条目
 */
export function getEntriesByCategory(categoryId: string): PasswordEntry[] {
  const rows = query<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM password_entries WHERE category_id = ? ORDER BY updated_at DESC', [categoryId]);

  return rows.map(decryptEntry);
}

/**
 * 按标签筛选条目
 */
export function getEntriesByTag(tagId: string): PasswordEntry[] {
  const rows = query<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>(`
    SELECT pe.* FROM password_entries pe
    INNER JOIN entry_tags et ON pe.id = et.entry_id
    WHERE et.tag_id = ?
    ORDER BY pe.updated_at DESC
  `, [tagId]);

  return rows.map(decryptEntry);
}

/**
 * 获取收藏的条目
 */
export function getFavoriteEntries(): PasswordEntry[] {
  const rows = query<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM password_entries WHERE favorite = 1 ORDER BY updated_at DESC');

  return rows.map(decryptEntry);
}

/**
 * 解密条目数据
 */
function decryptEntry(row: {
  id: string;
  encrypted_data: string;
  category_id: string | null;
  favorite: number;
  created_at: string;
  updated_at: string;
}): PasswordEntry {
  const encryptedData: EncryptedData = JSON.parse(row.encrypted_data);
  const decrypted = decryptObjectWithSessionKey<EncryptedEntryData>(encryptedData);

  return {
    id: row.id,
    title: decrypted.title,
    username: decrypted.username,
    password: decrypted.password,
    url: decrypted.url,
    notes: decrypted.notes,
    icon: decrypted.icon,
    categoryId: row.category_id || undefined,
    tags: decrypted.tags || [],
    favorite: row.favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
