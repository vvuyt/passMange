/**
 * 分类 CRUD 操作
 */

import { v4 as uuidv4 } from 'uuid';
import { execute, query, queryOne } from './db';
import { Category } from './models';

/**
 * 创建分类
 */
export function createCategory(category: Omit<Category, 'id'>): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  execute(
    `INSERT INTO categories (id, name, icon, color, sort_order, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, category.name, category.icon || null, category.color || null, 
     category.sortOrder, category.isDefault ? 1 : 0, now]
  );

  return id;
}

/**
 * 获取所有分类
 */
export function listCategories(): Category[] {
  const rows = query<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_default: number;
  }>('SELECT * FROM categories ORDER BY sort_order ASC');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon || undefined,
    color: row.color || undefined,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
  }));
}

/**
 * 获取单个分类
 */
export function getCategory(id: string): Category | null {
  const row = queryOne<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_default: number;
  }>('SELECT * FROM categories WHERE id = ?', [id]);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    icon: row.icon || undefined,
    color: row.color || undefined,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
  };
}


/**
 * 更新分类
 */
export function updateCategory(category: Category): void {
  execute(
    `UPDATE categories 
     SET name = ?, icon = ?, color = ?, sort_order = ?
     WHERE id = ? AND is_default = 0`,
    [category.name, category.icon || null, category.color || null, 
     category.sortOrder, category.id]
  );
}

/**
 * 删除分类
 * @param id 要删除的分类 ID
 * @param targetCategoryId 将该分类下的密码移动到的目标分类 ID（可选，不提供则设为 null）
 */
export function deleteCategory(id: string, targetCategoryId?: string): void {
  // 检查是否为默认分类
  const category = getCategory(id);
  if (!category || category.isDefault) {
    throw new Error('Cannot delete default category');
  }

  // 移动该分类下的密码到目标分类
  if (targetCategoryId) {
    execute(
      'UPDATE password_entries SET category_id = ? WHERE category_id = ?',
      [targetCategoryId, id]
    );
  } else {
    execute(
      'UPDATE password_entries SET category_id = NULL WHERE category_id = ?',
      [id]
    );
  }

  // 删除分类
  execute('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
}

/**
 * 获取分类下的密码数量
 */
export function getCategoryEntryCount(categoryId: string): number {
  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM password_entries WHERE category_id = ?',
    [categoryId]
  );
  return result?.count || 0;
}
