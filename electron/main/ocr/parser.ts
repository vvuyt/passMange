/**
 * Credential Parser Module
 * 凭证解析模块 - 从 OCR 结果中提取用户名和密码
 */

import { OCRResult, TextBlock } from './index';

export interface ParsedCredential {
  username?: string;
  password?: string;
  siteName?: string;
  confidence: number;
}

// 用户名识别模式
const USERNAME_PATTERNS: RegExp[] = [
  /用户名[：:]\s*(.+)/i,
  /账号[：:]\s*(.+)/i,
  /账户[：:]\s*(.+)/i,
  /登录名[：:]\s*(.+)/i,
  /用户[：:]\s*(.+)/i,
  /Username[：:]\s*(.+)/i,
  /User[：:]\s*(.+)/i,
  /Email[：:]\s*(.+)/i,
  /邮箱[：:]\s*(.+)/i,
  /手机号?[：:]\s*(.+)/i,
  /Phone[：:]\s*(.+)/i,
  /ID[：:]\s*(.+)/i,
];

// 密码识别模式
const PASSWORD_PATTERNS: RegExp[] = [
  /密码[：:]\s*(.+)/i,
  /口令[：:]\s*(.+)/i,
  /Password[：:]\s*(.+)/i,
  /Pass[：:]\s*(.+)/i,
  /PIN[：:]\s*(.+)/i,
];

// 网站名识别模式
const SITE_PATTERNS: RegExp[] = [
  /网站[：:]\s*(.+)/i,
  /站点[：:]\s*(.+)/i,
  /Site[：:]\s*(.+)/i,
  /Website[：:]\s*(.+)/i,
  /平台[：:]\s*(.+)/i,
  /应用[：:]\s*(.+)/i,
  /App[：:]\s*(.+)/i,
];

// 自定义模式存储
const customUsernamePatterns: RegExp[] = [];
const customPasswordPatterns: RegExp[] = [];

/**
 * 添加自定义识别模式
 */
export function addPattern(type: 'username' | 'password', pattern: RegExp): void {
  if (type === 'username') {
    customUsernamePatterns.push(pattern);
  } else {
    customPasswordPatterns.push(pattern);
  }
}

/**
 * 清除自定义模式
 */
export function clearCustomPatterns(): void {
  customUsernamePatterns.length = 0;
  customPasswordPatterns.length = 0;
}

/**
 * 从文本中提取匹配的值
 */
function extractValue(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * 清理提取的值
 */
function cleanValue(value: string): string {
  // 移除常见的干扰字符
  return value
    .replace(/[\r\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从 OCR 结果中解析凭证
 */
export function parse(ocrResult: OCRResult): ParsedCredential[] {
  const credentials: ParsedCredential[] = [];
  const text = ocrResult.text;
  const lines = text.split('\n').filter(line => line.trim());

  // 合并所有模式
  const allUsernamePatterns = [...USERNAME_PATTERNS, ...customUsernamePatterns];
  const allPasswordPatterns = [...PASSWORD_PATTERNS, ...customPasswordPatterns];

  // 方法1：逐行匹配
  let currentCredential: Partial<ParsedCredential> = {};
  let hasMatch = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 尝试匹配用户名
    const username = extractValue(trimmedLine, allUsernamePatterns);
    if (username) {
      if (currentCredential.username && hasMatch) {
        // 保存之前的凭证
        credentials.push({
          ...currentCredential,
          confidence: ocrResult.confidence,
        } as ParsedCredential);
        currentCredential = {};
      }
      currentCredential.username = cleanValue(username);
      hasMatch = true;
    }

    // 尝试匹配密码
    const password = extractValue(trimmedLine, allPasswordPatterns);
    if (password) {
      currentCredential.password = cleanValue(password);
      hasMatch = true;
    }

    // 尝试匹配网站名
    const siteName = extractValue(trimmedLine, SITE_PATTERNS);
    if (siteName) {
      currentCredential.siteName = cleanValue(siteName);
    }
  }

  // 保存最后一个凭证
  if (hasMatch && (currentCredential.username || currentCredential.password)) {
    credentials.push({
      ...currentCredential,
      confidence: ocrResult.confidence,
    } as ParsedCredential);
  }

  // 方法2：如果没有找到结构化的凭证，尝试启发式匹配
  if (credentials.length === 0) {
    const heuristicCredential = parseHeuristic(text, ocrResult.confidence);
    if (heuristicCredential) {
      credentials.push(heuristicCredential);
    }
  }

  return credentials;
}

/**
 * 启发式解析（当没有明确标签时）
 */
function parseHeuristic(text: string, confidence: number): ParsedCredential | null {
  const lines = text.split('\n').filter(line => line.trim());
  
  // 查找可能的邮箱地址作为用户名
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const phonePattern = /1[3-9]\d{9}/;
  
  let username: string | undefined;
  let password: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // 检查邮箱
    const emailMatch = trimmed.match(emailPattern);
    if (emailMatch && !username) {
      username = emailMatch[0];
      continue;
    }

    // 检查手机号
    const phoneMatch = trimmed.match(phonePattern);
    if (phoneMatch && !username) {
      username = phoneMatch[0];
      continue;
    }

    // 如果已经有用户名，下一个非空行可能是密码
    if (username && !password && trimmed.length >= 6 && trimmed.length <= 50) {
      // 简单的密码特征检测
      const hasLetter = /[a-zA-Z]/.test(trimmed);
      const hasNumber = /\d/.test(trimmed);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(trimmed);
      
      if ((hasLetter && hasNumber) || hasSpecial) {
        password = trimmed;
      }
    }
  }

  if (username || password) {
    return {
      username,
      password,
      confidence: confidence * 0.5, // 降低启发式匹配的置信度
    };
  }

  return null;
}

/**
 * 验证解析结果
 */
export function validateCredential(credential: ParsedCredential): boolean {
  // 至少需要用户名或密码
  if (!credential.username && !credential.password) {
    return false;
  }

  // 用户名长度检查
  if (credential.username && (credential.username.length < 1 || credential.username.length > 100)) {
    return false;
  }

  // 密码长度检查
  if (credential.password && (credential.password.length < 1 || credential.password.length > 200)) {
    return false;
  }

  return true;
}

export default {
  parse,
  addPattern,
  clearCustomPatterns,
  validateCredential,
};
