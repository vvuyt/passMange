/**
 * 密码库服务 - React Native 版本
 */

import { v4 as uuidv4 } from 'uuid';
import * as Keychain from 'react-native-keychain';
import {
  query,
  execute,
  queryOne,
  isVaultInitialized as dbIsVaultInitialized,
} from './database';
import {
  generateSalt,
  deriveKeyAsync,
  generateVerificationHash,
  verifyPassword,
  setDerivedKey,
  clearDerivedKey,
  encryptObject,
  decryptObject,
  getDerivedKey,
  DEFAULT_ITERATIONS,
} from '../utils/crypto';
import {
  PasswordEntry,
  Category,
  Tag,
  VaultMeta,
  EncryptedData,
} from '../types/models';

// 密码库状态
let isUnlockedState = false;

/**
 * 初始化密码库（首次设置）
 */
export async function setupVault(masterPassword: string): Promise<void> {
  const salt = generateSalt();
  const verificationHash = generateVerificationHash(
    masterPassword,
    salt,
    DEFAULT_ITERATIONS
  );
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO vault_meta (id, salt, verification_hash, created_at, updated_at, version)
     VALUES (1, ?, ?, ?, ?, 2)`,
    [salt, verificationHash, now, now]
  );

  // 派生密钥并保存到内存
  const key = await deriveKeyAsync(masterPassword, salt, DEFAULT_ITERATIONS);
  setDerivedKey(key, DEFAULT_ITERATIONS);
  isUnlockedState = true;
}

/**
 * 解锁密码库
 */
export async function unlockVault(masterPassword: string): Promise<boolean> {
  const meta = await queryOne<{
    salt: string;
    verification_hash: string;
    version: number;
  }>('SELECT salt, verification_hash, version FROM vault_meta WHERE id = 1');

  if (!meta) {
    throw new Error('Vault not initialized');
  }

  const iterations = meta.version >= 2 ? DEFAULT_ITERATIONS : 100000;

  if (!verifyPassword(masterPassword, meta.salt, meta.verification_hash, iterations)) {
    return false;
  }

  const key = await deriveKeyAsync(masterPassword, meta.salt, iterations);
  setDerivedKey(key, iterations);
  isUnlockedState = true;

  return true;
}

/**
 * 锁定密码库
 */
export function lockVault(): void {
  clearDerivedKey();
  isUnlockedState = false;
}

/**
 * 检查是否已解锁
 */
export function isUnlocked(): boolean {
  return isUnlockedState;
}

/**
 * 检查是否已初始化
 */
export async function isVaultInitialized(): Promise<boolean> {
  return dbIsVaultInitialized();
}

/**
 * 修改主密码
 */
export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  // 验证当前密码
  const meta = await queryOne<{
    salt: string;
    verification_hash: string;
    version: number;
  }>('SELECT salt, verification_hash, version FROM vault_meta WHERE id = 1');

  if (!meta) {
    throw new Error('Vault not initialized');
  }

  const iterations = meta.version >= 2 ? DEFAULT_ITERATIONS : 100000;

  if (!verifyPassword(currentPassword, meta.salt, meta.verification_hash, iterations)) {
    return false;
  }

  // 获取当前密钥解密所有数据
  const currentKey = await deriveKeyAsync(currentPassword, meta.salt, iterations);
  
  // 生成新的盐和验证哈希
  const newSalt = generateSalt();
  const newVerificationHash = generateVerificationHash(
    newPassword,
    newSalt,
    DEFAULT_ITERATIONS
  );
  const newKey = await deriveKeyAsync(newPassword, newSalt, DEFAULT_ITERATIONS);

  // 重新加密所有密码条目
  const entries = await query<{
    id: string;
    encrypted_data: string;
  }>('SELECT id, encrypted_data FROM password_entries');

  for (const entry of entries) {
    const encryptedData: EncryptedData = JSON.parse(entry.encrypted_data);
    const decrypted = decryptObject<object>(encryptedData, currentKey);
    const reEncrypted = encryptObject(decrypted, newKey);
    
    await execute(
      'UPDATE password_entries SET encrypted_data = ? WHERE id = ?',
      [JSON.stringify(reEncrypted), entry.id]
    );
  }

  // 更新 vault_meta
  const now = new Date().toISOString();
  await execute(
    `UPDATE vault_meta SET salt = ?, verification_hash = ?, updated_at = ?, version = 2 WHERE id = 1`,
    [newSalt, newVerificationHash, now]
  );

  // 更新内存中的密钥
  setDerivedKey(newKey, DEFAULT_ITERATIONS);

  return true;
}

// ==================== 密码条目操作 ====================

/**
 * 创建密码条目
 */
export async function createEntry(
  entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const key = getDerivedKey();

  const entryData: PasswordEntry = {
    ...entry,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // 加密敏感字段
  const encryptedData = encryptObject(
    {
      title: entryData.title,
      username: entryData.username,
      password: entryData.password,
      url: entryData.url,
      notes: entryData.notes,
      icon: entryData.icon,
    },
    key
  );

  await execute(
    `INSERT INTO password_entries (id, encrypted_data, category_id, favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      JSON.stringify(encryptedData),
      entry.categoryId || null,
      entry.favorite ? 1 : 0,
      now,
      now,
    ]
  );

  // 保存标签关联
  for (const tagId of entry.tags) {
    await execute(
      'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
      [id, tagId]
    );
  }

  return id;
}

/**
 * 获取所有密码条目
 */
export async function listEntries(): Promise<PasswordEntry[]> {
  const key = getDerivedKey();

  const rows = await query<{
    id: string;
    encrypted_data: string;
    category_id: string | null;
    favorite: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM password_entries ORDER BY updated_at DESC');

  const entries: PasswordEntry[] = [];

  for (const row of rows) {
    const encryptedData: EncryptedData = JSON.parse(row.encrypted_data);
    const decrypted = decryptObject<{
      title: string;
      username: string;
      password: string;
      url?: string;
      notes?: string;
      icon?: string;
    }>(encryptedData, key);

    // 获取标签
    const tagRows = await query<{ tag_id: string }>(
      'SELECT tag_id FROM entry_tags WHERE entry_id = ?',
      [row.id]
    );

    entries.push({
      id: row.id,
      ...decrypted,
      categoryId: row.category_id || undefined,
      tags: tagRows.map((t) => t.tag_id),
      favorite: row.favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  return entries;
}

/**
 * 更新密码条目
 */
export async function updateEntry(entry: PasswordEntry): Promise<void> {
  const key = getDerivedKey();
  const now = new Date().toISOString();

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

  await execute(
    `UPDATE password_entries 
     SET encrypted_data = ?, category_id = ?, favorite = ?, updated_at = ?
     WHERE id = ?`,
    [
      JSON.stringify(encryptedData),
      entry.categoryId || null,
      entry.favorite ? 1 : 0,
      now,
      entry.id,
    ]
  );

  // 更新标签
  await execute('DELETE FROM entry_tags WHERE entry_id = ?', [entry.id]);
  for (const tagId of entry.tags) {
    await execute(
      'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
      [entry.id, tagId]
    );
  }
}

/**
 * 删除密码条目
 */
export async function deleteEntry(id: string): Promise<void> {
  await execute('DELETE FROM password_entries WHERE id = ?', [id]);
}

/**
 * 切换收藏状态
 */
export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  const now = new Date().toISOString();
  await execute(
    'UPDATE password_entries SET favorite = ?, updated_at = ? WHERE id = ?',
    [favorite ? 1 : 0, now, id]
  );
}

// ==================== 分类操作 ====================

/**
 * 获取所有分类
 */
export async function listCategories(): Promise<Category[]> {
  const rows = await query<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_default: number;
  }>('SELECT * FROM categories ORDER BY sort_order');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon || undefined,
    color: row.color || undefined,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
  }));
}

/**
 * 创建分类
 */
export async function createCategory(
  category: Omit<Category, 'id'>
): Promise<string> {
  const id = `cat_${uuidv4()}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO categories (id, name, icon, color, sort_order, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      category.name,
      category.icon || null,
      category.color || null,
      category.sortOrder,
      category.isDefault ? 1 : 0,
      now,
    ]
  );

  return id;
}

/**
 * 更新分类
 */
export async function updateCategory(category: Category): Promise<void> {
  await execute(
    `UPDATE categories SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?`,
    [category.name, category.icon || null, category.color || null, category.sortOrder, category.id]
  );
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<void> {
  // 将该分类下的条目移到"无分类"
  await execute('UPDATE password_entries SET category_id = NULL WHERE category_id = ?', [id]);
  await execute('DELETE FROM categories WHERE id = ?', [id]);
}

// ==================== 标签操作 ====================

/**
 * 获取所有标签
 */
export async function listTags(): Promise<Tag[]> {
  const rows = await query<{
    id: string;
    name: string;
    color: string | null;
  }>('SELECT * FROM tags ORDER BY name');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color || undefined,
  }));
}

/**
 * 创建标签
 */
export async function createTag(tag: Omit<Tag, 'id'>): Promise<string> {
  const id = `tag_${uuidv4()}`;
  const now = new Date().toISOString();

  await execute(
    'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    [id, tag.name, tag.color || null, now]
  );

  return id;
}

/**
 * 更新标签
 */
export async function updateTag(tag: Tag): Promise<void> {
  await execute(
    'UPDATE tags SET name = ?, color = ? WHERE id = ?',
    [tag.name, tag.color || null, tag.id]
  );
}

/**
 * 删除标签
 */
export async function deleteTag(id: string): Promise<void> {
  await execute('DELETE FROM entry_tags WHERE tag_id = ?', [id]);
  await execute('DELETE FROM tags WHERE id = ?', [id]);
}
