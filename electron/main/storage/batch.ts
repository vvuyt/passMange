/**
 * 批量操作模块
 * 支持批量移动分类、添加/移除标签、删除
 */

import { execute, queryOne, saveDatabase } from './db';
import { deleteEntry } from './entries';

export interface BatchResult {
  success: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

/**
 * 批量移动到分类
 */
export function batchMoveCategory(ids: string[], categoryId: string | null): BatchResult {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const id of ids) {
    try {
      // 检查条目是否存在
      const entry = queryOne<{ id: string }>('SELECT id FROM password_entries WHERE id = ?', [id]);
      if (!entry) {
        failed++;
        errors.push({ id, error: '条目不存在' });
        continue;
      }

      // 更新分类
      execute(
        'UPDATE password_entries SET category_id = ?, updated_at = ? WHERE id = ?',
        [categoryId, now, id]
      );
      success++;
    } catch (error) {
      failed++;
      errors.push({ id, error: (error as Error).message });
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : undefined };
}

/**
 * 批量添加标签
 */
export function batchAddTags(ids: string[], tagIds: string[]): BatchResult {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const entryId of ids) {
    try {
      // 检查条目是否存在
      const entry = queryOne<{ id: string }>('SELECT id FROM password_entries WHERE id = ?', [entryId]);
      if (!entry) {
        failed++;
        errors.push({ id: entryId, error: '条目不存在' });
        continue;
      }

      // 添加标签关联
      for (const tagId of tagIds) {
        execute(
          'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
          [entryId, tagId]
        );
      }
      
      // 更新条目时间
      execute(
        'UPDATE password_entries SET updated_at = ? WHERE id = ?',
        [now, entryId]
      );
      success++;
    } catch (error) {
      failed++;
      errors.push({ id: entryId, error: (error as Error).message });
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : undefined };
}

/**
 * 批量移除标签
 */
export function batchRemoveTags(ids: string[], tagIds: string[]): BatchResult {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const entryId of ids) {
    try {
      // 检查条目是否存在
      const entry = queryOne<{ id: string }>('SELECT id FROM password_entries WHERE id = ?', [entryId]);
      if (!entry) {
        failed++;
        errors.push({ id: entryId, error: '条目不存在' });
        continue;
      }

      // 移除标签关联
      for (const tagId of tagIds) {
        execute(
          'DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?',
          [entryId, tagId]
        );
      }
      
      // 更新条目时间
      execute(
        'UPDATE password_entries SET updated_at = ? WHERE id = ?',
        [now, entryId]
      );
      success++;
    } catch (error) {
      failed++;
      errors.push({ id: entryId, error: (error as Error).message });
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : undefined };
}

/**
 * 批量删除
 */
export function batchDelete(ids: string[]): BatchResult {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    try {
      deleteEntry(id);
      success++;
    } catch (error) {
      failed++;
      errors.push({ id, error: (error as Error).message });
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : undefined };
}
