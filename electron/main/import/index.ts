/**
 * 导入模块
 * 支持 Excel 和浏览器 CSV 格式导入
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { ImportEntry, ImportResult, ImportError } from '../storage/models';
import { listEntries } from '../storage/entries';
import { listCategories, createCategory } from '../storage/categories';

// Excel 模板列定义（添加分类列）
const TEMPLATE_COLUMNS = ['标题', '用户名', '密码', '网址', '备注', '分类'];

// 浏览器 CSV 格式映射
const BROWSER_FORMATS: Record<string, { columns: string[]; mapping: Record<string, string> }> = {
  chrome: {
    columns: ['name', 'url', 'username', 'password'],
    mapping: { name: 'title', url: 'url', username: 'username', password: 'password' },
  },
  firefox: {
    columns: ['url', 'username', 'password', 'httpRealm', 'formActionOrigin', 'guid', 'timeCreated', 'timeLastUsed', 'timePasswordChanged'],
    mapping: { url: 'url', username: 'username', password: 'password' },
  },
  edge: {
    columns: ['name', 'url', 'username', 'password'],
    mapping: { name: 'title', url: 'url', username: 'username', password: 'password' },
  },
};

/**
 * 生成 Excel 导入模板
 */
export async function downloadTemplate(): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // 创建示例数据（包含分类列）
  const data = [
    TEMPLATE_COLUMNS,
    ['示例网站', 'user@example.com', 'password123', 'https://example.com', '这是备注', '工作'],
    ['个人邮箱', 'personal@email.com', 'mypassword', 'https://mail.example.com', '', '个人'],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  worksheet['!cols'] = [
    { wch: 20 }, // 标题
    { wch: 25 }, // 用户名
    { wch: 20 }, // 密码
    { wch: 30 }, // 网址
    { wch: 30 }, // 备注
    { wch: 15 }, // 分类
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '密码导入模板');
  
  // 弹出保存对话框
  const result = await dialog.showSaveDialog({
    title: '保存导入模板',
    defaultPath: path.join(app.getPath('downloads'), '密码导入模板.xlsx'),
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  });
  
  if (!result.canceled && result.filePath) {
    XLSX.writeFile(workbook, result.filePath);
  }
}

/**
 * 检测文件格式
 */
export function detectFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.xlsx' || ext === '.xls') {
    return 'excel';
  }
  
  if (ext === '.csv') {
    // 读取文件头部检测浏览器格式
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0].toLowerCase();
    
    // Chrome/Edge 格式
    if (firstLine.includes('name') && firstLine.includes('url') && firstLine.includes('username')) {
      if (firstLine.includes('note')) {
        return 'edge';
      }
      return 'chrome';
    }
    
    // Firefox 格式
    if (firstLine.includes('httprealm') || firstLine.includes('formactionorigin')) {
      return 'firefox';
    }
    
    return 'csv';
  }
  
  return 'unknown';
}

/**
 * 解析 Excel 文件
 */
function parseExcel(filePath: string): ImportEntry[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // header: 1 返回数组的数组
  const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
  
  if (data.length < 2) {
    return [];
  }
  
  // 获取表头
  const headerRow = data[0] as unknown[];
  const headers = headerRow.map(h => String(h || '').trim().toLowerCase());
  const entries: ImportEntry[] = [];
  
  // 列索引映射
  const titleIdx = headers.findIndex(h => h === '标题' || h === 'title' || h === 'name');
  const usernameIdx = headers.findIndex(h => h === '用户名' || h === 'username' || h === 'user');
  const passwordIdx = headers.findIndex(h => h === '密码' || h === 'password');
  const urlIdx = headers.findIndex(h => h === '网址' || h === 'url' || h === 'website');
  const notesIdx = headers.findIndex(h => h === '备注' || h === 'notes' || h === 'note');
  const categoryIdx = headers.findIndex(h => h === '分类' || h === 'category' || h === 'folder');
  
  // 解析数据行
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;
    
    const title = row[titleIdx] != null ? String(row[titleIdx]).trim() : '';
    const username = row[usernameIdx] != null ? String(row[usernameIdx]).trim() : '';
    const password = row[passwordIdx] != null ? String(row[passwordIdx]).trim() : '';
    const url = urlIdx >= 0 && row[urlIdx] != null ? String(row[urlIdx]).trim() : undefined;
    const notes = notesIdx >= 0 && row[notesIdx] != null ? String(row[notesIdx]).trim() : undefined;
    const category = categoryIdx >= 0 && row[categoryIdx] != null ? String(row[categoryIdx]).trim() : undefined;
    
    if (title || username || password) {
      entries.push({
        title: title || url || '未命名',
        username,
        password,
        url,
        notes,
        category,
        rowNumber: i + 1,
      });
    }
  }
  
  return entries;
}

/**
 * 解析 CSV 文件
 */
function parseCSV(filePath: string, format: string): ImportEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }
  
  // 解析 CSV 行（处理引号内的逗号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const entries: ImportEntry[] = [];
  
  // 获取格式映射
  const formatConfig = BROWSER_FORMATS[format];
  
  // 分类列索引（通用CSV格式）
  const categoryIdx = headers.findIndex(h => h === '分类' || h === 'category' || h === 'folder' || h === 'group');
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v)) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    let title = '';
    let username = '';
    let password = '';
    let url = '';
    let notes = '';
    let category: string | undefined;
    
    if (formatConfig) {
      // 使用浏览器格式映射
      title = row[formatConfig.mapping.title?.toLowerCase()] || '';
      username = row['username'] || '';
      password = row['password'] || '';
      url = row['url'] || '';
      
      // 如果没有标题，从 URL 提取域名
      if (!title && url) {
        try {
          const urlObj = new URL(url);
          title = urlObj.hostname.replace('www.', '');
        } catch {
          title = url;
        }
      }
    } else {
      // 通用 CSV 格式
      title = row['title'] || row['name'] || row['标题'] || '';
      username = row['username'] || row['user'] || row['用户名'] || '';
      password = row['password'] || row['密码'] || '';
      url = row['url'] || row['website'] || row['网址'] || '';
      notes = row['notes'] || row['note'] || row['备注'] || '';
      
      // 解析分类
      if (categoryIdx >= 0 && values[categoryIdx]) {
        category = values[categoryIdx].trim() || undefined;
      }
    }
    
    if (title || username || password) {
      entries.push({
        title: title || '未命名',
        username,
        password,
        url: url || undefined,
        notes: notes || undefined,
        category,
        rowNumber: i + 1,
      });
    }
  }
  
  return entries;
}

/**
 * 验证导入条目
 */
function validateEntries(entries: ImportEntry[]): { valid: ImportEntry[]; errors: ImportError[] } {
  const valid: ImportEntry[] = [];
  const errors: ImportError[] = [];
  
  for (const entry of entries) {
    const entryErrors: string[] = [];
    
    // 标题不能为空
    if (!entry.title || entry.title.trim() === '') {
      entryErrors.push('标题不能为空');
    }
    
    // 密码不能为空
    if (!entry.password || entry.password.trim() === '') {
      entryErrors.push('密码不能为空');
    }
    
    // URL 格式验证（如果有）
    if (entry.url && entry.url.trim()) {
      try {
        new URL(entry.url);
      } catch {
        // 尝试添加 https:// 前缀
        try {
          new URL('https://' + entry.url);
          entry.url = 'https://' + entry.url;
        } catch {
          entryErrors.push('网址格式无效');
        }
      }
    }
    
    if (entryErrors.length > 0) {
      errors.push({
        rowNumber: entry.rowNumber,
        message: entryErrors.join('; '),
      });
    } else {
      valid.push(entry);
    }
  }
  
  return { valid, errors };
}

/**
 * 检测重复条目
 */
function detectDuplicates(entries: ImportEntry[]): { unique: ImportEntry[]; duplicates: number } {
  const existingEntries = listEntries();
  const existingSet = new Set(
    existingEntries.map(e => `${e.title.toLowerCase()}|${e.username.toLowerCase()}`)
  );
  
  const unique: ImportEntry[] = [];
  let duplicates = 0;
  
  for (const entry of entries) {
    const key = `${entry.title.toLowerCase()}|${entry.username.toLowerCase()}`;
    if (existingSet.has(key)) {
      duplicates++;
    } else {
      unique.push(entry);
      existingSet.add(key); // 防止导入文件内部重复
    }
  }
  
  return { unique, duplicates };
}

/**
 * 分析导入条目中的分类
 * @returns 新分类列表（数据库中不存在的）
 */
function analyzeCategories(entries: ImportEntry[]): string[] {
  const existingCategories = listCategories();
  const existingNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
  
  const newCategories = new Set<string>();
  for (const entry of entries) {
    if (entry.category && entry.category.trim()) {
      const categoryName = entry.category.trim();
      if (!existingNames.has(categoryName.toLowerCase())) {
        newCategories.add(categoryName);
      }
    }
  }
  
  return Array.from(newCategories);
}

/**
 * 确保分类存在，不存在则创建
 * @returns 分类名称到ID的映射
 */
function ensureCategories(categoryNames: string[]): Map<string, string> {
  const categoryMap = new Map<string, string>();
  
  // 获取现有分类
  const existingCategories = listCategories();
  for (const cat of existingCategories) {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  }
  
  // 创建新分类
  for (const name of categoryNames) {
    if (!categoryMap.has(name.toLowerCase())) {
      const id = createCategory({ name, sortOrder: 999, isDefault: false });
      categoryMap.set(name.toLowerCase(), id);
    }
  }
  
  return categoryMap;
}

/**
 * 导入文件
 */
export function importFile(filePath: string, format?: string): ImportResult & { entries?: ImportEntry[]; newCategories?: string[] } {
  // 检测格式
  const detectedFormat = format || detectFormat(filePath);
  
  if (detectedFormat === 'unknown') {
    return {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [{ rowNumber: 0, message: '不支持的文件格式' }],
    };
  }
  
  // 解析文件
  let entries: ImportEntry[];
  try {
    if (detectedFormat === 'excel') {
      entries = parseExcel(filePath);
    } else {
      entries = parseCSV(filePath, detectedFormat);
    }
  } catch (error) {
    return {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [{ rowNumber: 0, message: `解析文件失败: ${(error as Error).message}` }],
    };
  }
  
  if (entries.length === 0) {
    return {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [{ rowNumber: 0, message: '文件中没有有效数据' }],
    };
  }
  
  // 验证数据
  const { valid, errors } = validateEntries(entries);
  
  // 检测重复
  const { unique, duplicates } = detectDuplicates(valid);
  
  // 分析新分类
  const newCategories = analyzeCategories(unique);
  
  return {
    success: unique.length,
    failed: errors.length,
    duplicates,
    errors,
    // 返回待导入的条目供前端确认
    entries: unique,
    // 返回将要创建的新分类
    newCategories,
  };
}

/**
 * 执行导入（在用户确认后调用）
 */
export function executeImport(entries: ImportEntry[]): { success: number; failed: number; categoriesCreated: number } {
  const { createEntry } = require('../storage/entries');
  
  let success = 0;
  let failed = 0;
  
  // 收集所有分类名称并确保它们存在
  const categoryNames = entries
    .filter(e => e.category && e.category.trim())
    .map(e => e.category!.trim());
  const uniqueCategoryNames = [...new Set(categoryNames)];
  
  // 确保分类存在并获取映射
  const categoryMap = ensureCategories(uniqueCategoryNames);
  const categoriesCreated = uniqueCategoryNames.filter(name => {
    const existingCategories = listCategories();
    return !existingCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
  }).length;
  
  // 获取默认分类ID
  const defaultCategory = listCategories().find(c => c.isDefault);
  const defaultCategoryId = defaultCategory?.id;
  
  for (const entry of entries) {
    try {
      // 确定分类ID
      let categoryId: string | undefined;
      if (entry.category && entry.category.trim()) {
        categoryId = categoryMap.get(entry.category.trim().toLowerCase());
      } else {
        categoryId = defaultCategoryId;
      }
      
      createEntry({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        notes: entry.notes,
        categoryId,
        tags: [],
        favorite: false,
      });
      success++;
    } catch {
      failed++;
    }
  }
  
  return { success, failed, categoriesCreated };
}
