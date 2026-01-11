/**
 * 标签 CRUD 操作
 */

import { v4 as uuidv4 } from 'uuid';
import { execute, query, queryOne } from './db';
import { Tag } from './models';

/**
 * 创建标签
 */
export function createTag(tag: Omit<Tag, 'id'>): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  execute(
    `INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)`,
    [id, tag.name, tag.color || null, now]
  );

  return id;
}

/**
 * 获取所有标签
 */
export function listTags(): Tag[] {
  const rows = query<{
    id: string;
    name: string;
    color: string | null;
  }>('SELECT id, name, color FROM tags ORDER BY name ASC');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color || undefined,
  }));
}

/**
 * 获取单个标签
 */
export function getTag(id: string): Tag | null {
  const row = queryOne<{
    id: string;
    name: string;
    color: string | null;
  }>('SELECT id, name, color FROM tags WHERE id = ?', [id]);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    color: row.color || undefined,
  };
}

/**
 * 更新标签
 */
export function updateTag(tag: Tag): void {
  execute(
    'UPDATE tags SET name = ?, color = ? WHERE id = ?',
    [tag.name, tag.color || null, tag.id]
  );
}

/**
 * 删除标签
 */
export function deleteTag(id: string): void {
  // 删除关联关系
  execute('DELETE FROM entry_tags WHERE tag_id = ?', [id]);
  // 删除标签
  execute('DELETE FROM tags WHERE id = ?', [id]);
}

/**
 * 获取标签下的密码数量
 */
export function getTagEntryCount(tagId: string): number {
  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM entry_tags WHERE tag_id = ?',
    [tagId]
  );
  return result?.count || 0;
}
