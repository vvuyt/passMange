/**
 * 数据库操作实现
 * 使用 sql.js 进行 SQLite 操作（纯 JavaScript，无需编译）
 */

import initSqlJs, { Database } from 'sql.js';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let db: Database | null = null;
let dbPath: string = '';

/**
 * 获取数据库文件路径
 */
function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'vault.db');
}

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  dbPath = getDbPath();

  // 确保目录存在
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 如果数据库文件存在，加载它
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表结构
  createTables();
}

/**
 * 创建数据库表
 */
function createTables(): void {
  if (!db) throw new Error('Database not initialized');

  // 密码库元数据表
  db.run(`
    CREATE TABLE IF NOT EXISTS vault_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salt TEXT NOT NULL,
      verification_hash TEXT NOT NULL,
      totp_enabled INTEGER DEFAULT 0,
      totp_secret_encrypted TEXT,
      recovery_codes_encrypted TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);


  // 分类表
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // 密码条目表（加密存储）
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES password_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // 备份记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      backup_type TEXT NOT NULL
    )
  `);

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_category ON password_entries(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_favorite ON password_entries(favorite)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id)`);

  // 插入默认分类（如果不存在）
  insertDefaultCategories();

  // 保存数据库
  saveDatabase();
}


/**
 * 插入默认分类
 */
function insertDefaultCategories(): void {
  if (!db) return;

  const defaultCategories = [
    { id: 'cat_work', name: '工作', icon: '💼', color: '#3B82F6', sortOrder: 1 },
    { id: 'cat_personal', name: '个人', icon: '👤', color: '#10B981', sortOrder: 2 },
    { id: 'cat_finance', name: '金融', icon: '💰', color: '#F59E0B', sortOrder: 3 },
    { id: 'cat_social', name: '社交', icon: '💬', color: '#8B5CF6', sortOrder: 4 },
    { id: 'cat_shopping', name: '购物', icon: '🛒', color: '#EC4899', sortOrder: 5 },
    { id: 'cat_other', name: '其他', icon: '📁', color: '#6B7280', sortOrder: 6 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  const now = new Date().toISOString();
  for (const cat of defaultCategories) {
    stmt.run([cat.id, cat.name, cat.icon, cat.color, cat.sortOrder, now]);
  }
  stmt.free();
}

/**
 * 保存数据库到文件
 */
export function saveDatabase(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

/**
 * 检查密码库是否已初始化
 */
export function isVaultInitialized(): boolean {
  if (!db) return false;
  const result = db.exec('SELECT COUNT(*) as count FROM vault_meta');
  return result.length > 0 && result[0].values[0][0] as number > 0;
}

/**
 * 执行查询并返回结果
 */
export function query<T>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * 执行单条插入/更新/删除
 */
export function execute(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
}

/**
 * 获取单条记录
 */
export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const results = query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}
