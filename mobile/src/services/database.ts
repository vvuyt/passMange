/**
 * 数据库服务 - React Native 版本
 * 使用 react-native-sqlite-storage
 */

import SQLite, {
  SQLiteDatabase,
  ResultSet,
} from 'react-native-sqlite-storage';
import { Category, Tag, VaultMeta } from '../types/models';

// 启用 Promise API
SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat_work', name: '工作', icon: '💼', color: '#3B82F6', sortOrder: 1, isDefault: true },
  { id: 'cat_personal', name: '个人', icon: '👤', color: '#10B981', sortOrder: 2, isDefault: true },
  { id: 'cat_finance', name: '金融', icon: '💰', color: '#F59E0B', sortOrder: 3, isDefault: true },
  { id: 'cat_social', name: '社交', icon: '💬', color: '#8B5CF6', sortOrder: 4, isDefault: true },
  { id: 'cat_shopping', name: '购物', icon: '🛒', color: '#EC4899', sortOrder: 5, isDefault: true },
  { id: 'cat_other', name: '其他', icon: '📁', color: '#6B7280', sortOrder: 6, isDefault: true },
];

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabase({
    name: 'vault.db',
    location: 'default',
  });

  await createTables();
}

/**
 * 创建表结构
 */
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // 密码库元数据表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS vault_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salt TEXT NOT NULL,
      verification_hash TEXT NOT NULL,
      totp_enabled INTEGER DEFAULT 0,
      totp_secret_encrypted TEXT,
      recovery_codes_encrypted TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 2
    )
  `);

  // 分类表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // 标签表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // 密码条目表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS password_entries (
      id TEXT PRIMARY KEY,
      encrypted_data TEXT NOT NULL,
      category_id TEXT,
      favorite INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // 条目-标签关联表
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES password_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  await db.executeSql(
    'CREATE INDEX IF NOT EXISTS idx_entries_category ON password_entries(category_id)'
  );
  await db.executeSql(
    'CREATE INDEX IF NOT EXISTS idx_entries_favorite ON password_entries(favorite)'
  );

  // 插入默认分类
  await insertDefaultCategories();
}

/**
 * 插入默认分类
 */
async function insertDefaultCategories(): Promise<void> {
  if (!db) return;

  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    await db.executeSql(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [cat.id, cat.name, cat.icon, cat.color, cat.sortOrder, now]
    );
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase(): SQLiteDatabase {
  if (!db) throw new Error('Database not initialized');
  return db;
}

/**
 * 关闭数据库
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * 检查密码库是否已初始化
 */
export async function isVaultInitialized(): Promise<boolean> {
  if (!db) return false;
  const [result] = await db.executeSql(
    'SELECT COUNT(*) as count FROM vault_meta'
  );
  return result.rows.item(0).count > 0;
}

/**
 * 执行查询
 */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(sql, params);
  const rows: T[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i) as T);
  }
  return rows;
}

/**
 * 执行单条语句
 */
export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(sql, params);
}

/**
 * 获取单条记录
 */
export async function queryOne<T>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * 事务执行
 */
export async function transaction<T>(
  callback: (tx: SQLiteDatabase) => Promise<T>
): Promise<T> {
  if (!db) throw new Error('Database not initialized');
  
  await db.executeSql('BEGIN TRANSACTION');
  try {
    const result = await callback(db);
    await db.executeSql('COMMIT');
    return result;
  } catch (error) {
    await db.executeSql('ROLLBACK');
    throw error;
  }
}
